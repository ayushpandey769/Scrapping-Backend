import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { saveSession, VerificationError } from "./browserStore.js";

// Use stealth plugin
chromium.use(StealthPlugin());

const humanDelay = (min = 100, max = 300) => {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.random() * (max - min) + min)
  );
};

async function humanType(page, selector, text) {
  // Playwright click
  await page.click(selector);
  await humanDelay(300, 600);

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (Math.random() < 0.03 && i < text.length - 1) {
      const wrongChar = String.fromCharCode(
        97 + Math.floor(Math.random() * 26)
      );
      await page.keyboard.type(wrongChar, { delay: Math.random() * 100 + 50 });
      await humanDelay(100, 300);
      await page.keyboard.press("Backspace");
      await humanDelay(200, 400);
    }

    await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
  }

  await humanDelay(500, 1000);
}

async function humanClick(page, selector) {
  const element = await page.$(selector);

  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  const box = await element.boundingBox();

  if (box) {
    const x = box.x + Math.random() * box.width;
    const y = box.y + Math.random() * box.height;

    // Playwright mouse move
    await page.mouse.move(x / 2, y / 2, { steps: 8 });
    await humanDelay(100, 200);
    await page.mouse.move(x, y, { steps: 8 });
    await humanDelay(200, 400);
  }

  await element.click();
  await humanDelay(300, 600);
}

async function randomScroll(page, minScroll = 100, maxScroll = 300) {
  await page.evaluate(
    (args) => {
      window.scrollBy(0, Math.random() * (args.max - args.min) + args.min);
    },
    { min: minScroll, max: maxScroll }
  );

  await humanDelay(1000, 2000);
}

export async function performHumanLogin(
  email,
  password,
  existingBrowser = null,
  existingPage = null
) {
  let browser = existingBrowser;
  let page = existingPage;
  let createdBrowser = false;

  try {
    if (!browser) {
      // Launch Playwright Chromium
      // Launch Playwright Chromium
      browser = await chromium.launch({
        headless: true, // Render requires headless mode
        slowMo: 50,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage", // CRITICAL for Docker/Render
          "--disable-infobars",
          "--window-position=0,0",
          "--ignore-certifcate-errors",
          "--ignore-certifcate-errors-spki-list",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
          "--enable-features=NetworkService",
        ],
      });
      createdBrowser = true;
    }

    if (!page) {
      // Create context with specific viewport and user agent
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport: { width: 1366, height: 768 },
      });
      page = await context.newPage();
    }

    console.log("🌐 Navigating to LinkedIn...");

    await page.goto("https://www.linkedin.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await humanDelay(1500, 2500);

    await randomScroll(page, 100, 250);
    await humanDelay(1000, 2000);

    console.log("🔐 Starting login process...");

    const currentUrl = page.url();
    if (!currentUrl.includes("/login")) {
      console.log("👆 Clicking Sign In...");
      await humanClick(
        page,
        'a[data-tracking-control-name="guest_homepage-basic_nav-header-signin"]'
      );

      await page
        .waitForURL("**/login**", { timeout: 15000 })
        .catch(() => console.log("Navigation check timeout"));
    }

    await page.waitForSelector("#username", {
      state: "visible",
      timeout: 10000,
    });

    await humanDelay(500, 1000);

    console.log("✍️  Typing email...");
    await humanType(page, "#username", email);

    await humanDelay(800, 1500);

    console.log("🔑 Typing password...");
    await humanType(page, "#password", password);

    await humanDelay(1000, 2000);

    await page.mouse.move(
      Math.random() * 400 + 100,
      Math.random() * 200 + 100,
      { steps: 5 }
    );

    await humanDelay(500, 1000);

    // Uncheck "Keep me signed in" checkbox
    try {
      console.log("📋 Checking 'Keep me signed in' status...");
      
      // Target the checkbox and its label
      const checkboxSelector = '#rememberMeOptIn-checkbox';
      const labelSelector = 'label[for="rememberMeOptIn-checkbox"]';
      
      // Wait briefly for it to appear
      const checkbox = await page.$(checkboxSelector);
      
      if (checkbox) {
        // Check state using evaluate for reliability
        const isChecked = await page.$eval(checkboxSelector, el => el.checked);
        console.log(`📋 'Keep me signed in' is currently: ${isChecked ? 'CHECKED' : 'UNCHECKED'}`);
        
        if (isChecked) {
          console.log("👇 Unchecking via Label click...");
          // Click the LABEL, not the checkbox (often works better for hidden inputs)
          const label = await page.$(labelSelector);
          if (label) {
            await label.click();
          } else {
            await checkbox.click();
          }
          await humanDelay(500, 1000);
          
          // Verify
          const stillChecked = await page.$eval(checkboxSelector, el => el.checked);
          console.log(`📋 Status after click: ${stillChecked ? 'STILL CHECKED (Failed)' : 'UNCHECKED (Success)'}`);
        }
      } else {
        console.log("⚠️ Could not find 'Keep me signed in' checkbox");
      }
    } catch (err) {
      console.log("⚠️ Error handling checkbox:", err.message);
    }

    console.log("🚀 Clicking Sign In button...");
    await humanClick(page, 'button[type="submit"]');

    // Wait for navigation after login
    await page.waitForLoadState("domcontentloaded").catch(() => {});

    await humanDelay(2000, 4000);

    const currentPageUrl = page.url();

    // Check for security verification (checkpoint/challenge)
    if (
      currentPageUrl.includes("/checkpoint") ||
      currentPageUrl.includes("/challenge")
    ) {
      console.log("🔒 Security verification detected!");
      
      // Check if it's a PIN verification challenge
      const pinInput = await page.$('input[name="pin"], #input__email_verification_pin');
      
      if (pinInput) {
        console.log("📧 Email PIN verification required!");
        console.log("⚠️ Pausing for PIN entry via frontend...");
        saveSession(email, browser, page);
        throw new VerificationError("Verification PIN required");
      }
      
      // If no PIN input found, it might be another type of challenge
      console.log("⏳ Other security challenge detected, waiting for manual completion...");
      console.log("Waiting 90 seconds for manual completion...");

      // Wait for manually solved challenge
      const start = Date.now();
      while (Date.now() - start < 90000) {
        if (
          !page.url().includes("/checkpoint") &&
          !page.url().includes("/challenge")
        ) {
          break;
        }
        await page.waitForTimeout(1000);
      }

      if (
        page.url().includes("/checkpoint") ||
        page.url().includes("/challenge")
      ) {
        throw new Error("Security verification not completed in time");
      }
    }

    if (page.url().includes("/login")) {
      // Check for error messages on the login page
      const errorElement = await page.$(".form__label--error");
      if (errorElement) {
        const errorText = await errorElement.textContent();
        throw new Error(`Login failed: ${errorText}`);
      }

      // Check for alert messages
      const alertElement = await page.$(".alert");
      if (alertElement) {
        const alertText = await alertElement.textContent();
        throw new Error(`Login failed: ${alertText}`);
      }

      // Generic login failure
      throw new Error(
        "Login failed - Incorrect email or password. Please check your credentials and try again."
      );
    }

    console.log("✅ Login successful!");

    await humanDelay(3000, 5000);

    console.log("🎉 Session established, ready to scrape!");

    return { browser, page, createdBrowser };
  } catch (error) {
    console.error("❌ Login error:", error.message);

    // Don't close browser if verification is needed (it must stay open for OTP)
    if (error instanceof VerificationError) {
      console.log("🔓 Browser kept open for verification (in humanLogin)");
      throw error;
    }

    // For other errors, close the browser
    if (createdBrowser && browser) {
      await browser.close();
    }

    throw error;
  }
}

export async function isLoggedIn(page) {
  try {
    const currentUrl = page.url();

    if (currentUrl.includes("/login")) {
      return false;
    }

    const cookies = await page.context().cookies();
    const hasAuthCookie = cookies.some((c) => c.name === "li_at");

    return hasAuthCookie;
  } catch (error) {
    return false;
  }
}

export { humanDelay, humanType, humanClick, randomScroll };
