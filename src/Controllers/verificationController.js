import { getSession, removeSession } from "../utils/browserStore.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { scrapeUserPosts } from "../utils/scrapeUserPosts.js";
import { saveUserAndPosts } from "../utils/saveUserAndPosts.js";
import { humanDelay } from "../utils/humanLogin.js";

export const submitVerification = async (req, res) => {
  try {
    const { email, password, code } = req.body;

    if (!email || !code || !password) {
      throw new apiError(400, "Email, password, and verification code are required");
    }

    const session = getSession(email);

    if (!session) {
      throw new apiError(404, "No active login session found for this email. Please try logging in again.");
    }

    const { browser, page } = session;

    console.log(`🔓 Submitting verification PIN for ${email}...`);

    try {
      // Find the PIN input field
      const pinInput = await page.$('input[name="pin"], #input__email_verification_pin');
      
      if (!pinInput) {
        throw new Error("PIN input field currently not visible on page");
      }

      await pinInput.type(code, { delay: 100 });
      await humanDelay(500, 1000);

      const submitBtn = await page.$('#email-pin-submit-button, button[type="submit"]');
      if (submitBtn) {
          await submitBtn.click();
      } else {
          await page.keyboard.press('Enter');
      }

      console.log("⏳ Waiting for PIN submission...");
      
      // Wait for navigation away from checkpoint
      await page.waitForFunction(
          () => !window.location.href.includes('checkpoint') && !window.location.href.includes('challenge'), 
          { timeout: 20000 }
      );
      
      console.log("✅ PIN Accepted! Resuming scrape...");

      // Remove session from store as we are resuming
      removeSession(email);

      // Resume scraping with the EXISTING browser/page
      const result = await scrapeUserPosts(
        email, 
        password, 
        null, 
        50, 
        Infinity, 
        browser, 
        page
      );

      console.log(`💾 Saving ${result.posts.length} posts to database...`);
      await saveUserAndPosts(result.username, result.posts, email, password);

      return res.status(200).json(
        new apiResponse(
          200,
          {
            username: result.username,
            email: email,
            postsScraped: result.posts.length,
            fromCache: false,
          },
          "Verification successful and scraping completed"
        )
      );

    } catch (scrapeErr) {
        // If scraping fails after verification, we should still handle it
        throw scrapeErr;
    }

  } catch (error) {
    console.error("❌ Verification/Scraping failed:", error.message);
    
    // Clean up session if it failed
    const { email } = req.body;
    if (email) {
        const session = getSession(email);
        if (session && session.browser) {
            await session.browser.close().catch(() => {});
            removeSession(email);
        }
    }

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json(
      new apiError(statusCode, error.message || "Failed to verify code")
    );
  }
};
