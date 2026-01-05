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

      // Clear the input field more thoroughly
      await pinInput.click();
      await humanDelay(300, 500);
      
      // Select all and delete (multiple methods for reliability)
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await humanDelay(200, 300);
      
      // Verify field is empty
      const currentValue = await pinInput.inputValue();
      if (currentValue) {
        console.log(`⚠️ Field not empty, clearing again: "${currentValue}"`);
        await pinInput.fill(''); // Force clear
        await humanDelay(200, 300);
      }

      // Type the code slowly and deliberately
      console.log(`📝 Typing verification code: ${code}`);
      await pinInput.type(code, { delay: 200 }); // Slower typing
      await humanDelay(500, 800);
      
      // VERIFY what was actually typed
      const typedValue = await pinInput.inputValue();
      console.log(`✅ Verified input value: "${typedValue}"`);
      
      if (typedValue !== code) {
        console.error(`❌ Mismatch! Expected: "${code}", Got: "${typedValue}"`);
        // Try one more time
        await pinInput.fill(code);
        await humanDelay(500, 800);
      }

      // Find and click submit button
      const submitBtn = await page.$('#email-pin-submit-button, button[type="submit"]');
      if (submitBtn) {
          console.log("🖱️ Clicking submit button...");
          await submitBtn.click();
      } else {
          console.log("⌨️ Pressing Enter key...");
          await page.keyboard.press('Enter');
      }

      console.log("⏳ Waiting for response from LinkedIn...");
      
      // Wait longer for the page to react (LinkedIn can be slow)
      await humanDelay(3000, 4000);

      // Check for error messages FIRST before waiting for navigation
      const errorSelectors = [
        '.form__label--error',
        '.alert--error',
        '[data-test-id="error-message"]',
        '.artdeco-inline-feedback--error',
        'div[role="alert"]'
      ];

      for (const selector of errorSelectors) {
        // Only consider checking if the element is actually visible
        if (await page.isVisible(selector).catch(() => false)) {
          const errorElement = await page.$(selector);
          const errorText = await errorElement.textContent();
          
          if (errorText && errorText.trim().length > 0) {
            console.log(`❌ LinkedIn error detected: ${errorText}`);
            throw new apiError(400, `Invalid verification code: ${errorText.trim()}`);
          }
        }
      }


      // If no error, wait for successful navigation
      try {
        await page.waitForFunction(
          () => !window.location.href.includes('checkpoint') && !window.location.href.includes('challenge'), 
          { timeout: 15000 }
        );
        console.log("✅ PIN Accepted! Resuming scrape...");
      } catch (waitError) {
        // If waitForFunction times out, it means we're still on checkpoint page
        // Check one more time for errors
        const currentUrl = page.url();
        if (currentUrl.includes('checkpoint') || currentUrl.includes('challenge')) {
          console.log("❌ Still on verification page after timeout");
          
          // Try to get any error message
          const errorMsg = await page.evaluate(() => {
            const errorEl = document.querySelector('.form__label--error, .alert--error, [role="alert"]');
            return errorEl ? errorEl.textContent.trim() : null;
          });
          
          if (errorMsg) {
            throw new apiError(400, `Verification failed: ${errorMsg}`);
          } else {
            throw new apiError(408, "Verification timeout - LinkedIn did not respond. The code might be incorrect or expired.");
          }
        }
      }

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
