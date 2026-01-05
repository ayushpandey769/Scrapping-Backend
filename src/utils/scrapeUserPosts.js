import {
  performHumanLogin,
  humanDelay,
  randomScroll,
} from "./humanLogin.js";
import { parseCount } from "../utils/parseCount.js";
import { randomDelay } from "../utils/randomDelay.js";
import { getUsername } from "../utils/getUserName.js";
import { parseLikeCount } from "./parseLikeCount.js";
import { saveSession, VerificationError } from "./browserStore.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function scrapeUserPosts(
  email,
  password,
  profileUrl = null,
  scrolls = 50,
  maxPosts = Infinity,
  existingBrowser = null,
  existingPage = null
) {
  let browser = existingBrowser;
  let page = existingPage;
  let verificationNeeded = false;
  let createdBrowser = false; // Track if we created the browser

  try {
    // Only login if we don't have an existing browser/page
    if (!browser || !page) {
      console.log("🔐 Starting authentication...");
      const loginResult = await performHumanLogin(email, password);
      browser = loginResult.browser;
      page = loginResult.page;
      createdBrowser = loginResult.createdBrowser || true; // Track that we created it
    } else {
      console.log("🔄 Reusing existing browser session...");
    }


    // ... (rest of the logic) ...
    
    // NOTE: To avoid replacing the huge block, I will target the end of the function only. 
    // But I need to allow the 'verificationNeeded' variable to be available.
    // This tool call might be too hard with replace_file_content for the whole function wrapper.
    // I will try to use the multi_replace or just match the start and end.
    
    // Actually, I can just check if the error is thrown.
    // But I can't access the error in finally.
    
    // Let's try to wrap the specific try/catch block.
    // Since I can't see the whole file efficiently in my head, I'll assume the structure is:
    // export async function ... {
    //   let browser = null;
    //   try { ... } catch(e) { ... } finally { ... }
    // }
    
    // I will replace the start to add `let verificationNeeded = false;`
    // And replace the catch/finally to use it.


    // If no profileUrl provided, get the logged-in user's profile
    if (!profileUrl) {
      console.log("🔍 Detecting logged-in user's profile...");
      
      // Wait for page to stabilize after login/verification
      await humanDelay(3000, 5000);
      
      // Log current URL for debugging
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);

      // Optimization: Try to extract username from CURRENT page (likely Feed) first
      // This avoids the risky/slow navigation to /in/me/
      console.log("🔍 Attempting to extract username from current page...");
      
      let extractedUsername = await page.evaluate(() => {
        // Method 1: Mini-profile in left sidebar (Feed)
        const miniProfileLink = document.querySelector('.feed-identity-module__actor-link');
        if (miniProfileLink && miniProfileLink.href) {
            const match = miniProfileLink.href.match(/\/in\/([^\/\?]+)/);
            if (match && match[1] !== 'me') return match[1];
        }

        // Method 2: "Me" icon in navbar
        const navProfileLink = document.querySelector('.global-nav__me video, .global-nav__me img');
        if (navProfileLink) {
            const parent = navProfileLink.closest('a'); // usually triggers dropdown, but might have href
            // Actually the "Me" button usually doesn't have the username in href directly in DOM until clicked
        }
        
        // Method 3: Any profile link that looks like 'me'
        const profileLinks = Array.from(document.querySelectorAll('a[href*="/in/"]'));
        for (const link of profileLinks) {
             // Look for prominent links, often with 'actor' or 'profile' in class
             if (link.className.includes('actor') || link.className.includes('profile') || link.className.includes('identity')) {
                 const match = link.href.match(/\/in\/([^\/\?]+)/);
                 if (match && match[1] !== 'me') return match[1];
             }
        }
        return null;
      });

      if (!extractedUsername) {
          console.log("⚠️ Could not extract from current page, trying fallback navigation to /in/me/...");
          try {
            await page.goto("https://www.linkedin.com/in/me/", {
                waitUntil: "domcontentloaded",
                timeout: 45000, 
            });
            await humanDelay(2000, 4000);
          } catch (navErr) {
              console.log("⚠️ Navigation to /in/me/ timed out, trying to extract anyway...");
          }
      } else {
          console.log("✅ Extracted username directly from Feed!", extractedUsername);
      }
      
      // If we still don't have it, run the robust extractor on the current page (which is either Feed or Profile)
      if (!extractedUsername) {
        console.log("🔍 Running robust username extraction...");
        extractedUsername = await page.evaluate(() => {
          // Method 1: Try to get from profile edit button or view profile link
          const editProfileBtn = document.querySelector('a[href*="/in/"][href*="/edit/"]');
          if (editProfileBtn && editProfileBtn.href) {
            const match = editProfileBtn.href.match(/\/in\/([^\/\?]+)/);
            if (match && match[1] !== 'me') {
              return match[1];
            }
          }
          
          // Method 2: Try to get from any profile link
          const profileLinks = document.querySelectorAll('a[href*="/in/"]');
          for (const link of profileLinks) {
            const match = link.href.match(/\/in\/([^\/\?]+)/);
            if (match && match[1] !== 'me' && !match[1].includes('detail')) {
              return match[1];
            }
          }
          
          // Method 3: Try canonical URL
          const canonical = document.querySelector('link[rel="canonical"]');
          if (canonical && canonical.href) {
            const match = canonical.href.match(/\/in\/([^\/\?]+)/);
            if (match && match[1] !== 'me') {
              return match[1];
            }
          }
          
          // Method 4: Try to get from profile image link
          const profileImg = document.querySelector('img[alt*="profile"]');
          if (profileImg) {
            const parent = profileImg.closest('a');
            if (parent && parent.href) {
              const match = parent.href.match(/\/in\/([^\/\?]+)/);
              if (match && match[1] !== 'me') {
                return match[1];
              }
            }
          }
          
          // Method 5: Try to get from page metadata
          const metaOgUrl = document.querySelector('meta[property="og:url"]');
          if (metaOgUrl && metaOgUrl.content) {
            const match = metaOgUrl.content.match(/\/in\/([^\/\?]+)/);
            if (match && match[1] !== 'me') {
              return match[1];
            }
          }
          
          return null;
        });
      }

      // Final check: Do we have a username?
      if (extractedUsername) {
        profileUrl = `https://www.linkedin.com/in/${extractedUsername}`;
        console.log("✅ Extracted username:", extractedUsername);
        console.log("✅ Profile URL:", profileUrl);
      } else {
        const debugUrl = page.url();
        throw new Error(`Failed to extract username from profile page. Current URL: ${debugUrl}. Please check if you're logged in correctly.`);
      }
    }

    console.log("📍 Navigating to profile:", profileUrl);
    await page.goto(`${profileUrl}/recent-activity/all/`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await humanDelay(2000, 3000);

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 1.8);
    });

    await delay(2000);

    try {
      // Playwright waitForSelector
      await page.waitForSelector('div[data-urn^="urn:li:activity"]', {
        state: 'attached',
        timeout: 15000,
      });
      console.log("✅ Posts found! Starting collection...");
    } catch (err) {
      console.log("⚠️ No activity posts found on this profile.");
      
      // Return empty result instead of throwing error
      console.log("✅ Scraping completed with 0 posts!");
      return {
        username: getUsername(profileUrl),
        posts: [],
      };
    }

    const collected = new Map();

    for (let i = 0; i < scrolls; i++) {
      console.log(`🔄 Scroll ${i + 1}/${scrolls}`);

      const postsOnPage = await page.evaluate(() => {
        const nodes = Array.from(
          document.querySelectorAll('div[data-urn^="urn:li:activity"]')
        );

        return nodes.map((node) => {
          const urn = node.getAttribute("data-urn");

          const description =
            node.querySelector(
              'div.feed-shared-update-v2__description span[dir="ltr"]'
            )?.innerText || "";

          const likesLabel =
            node
              .querySelector(
                'button[aria-label*="reaction"], span[aria-label*="reaction"]'
              )
              ?.getAttribute("aria-label") || "0";

          const commentsText =
            node.querySelector('button[aria-label*="comment"]')?.innerText ||
            "0";

          const images = Array.from(
            node.querySelectorAll(
              '.feed-shared-update-v2__content img[src*="feedshare"], ' +
                ".feed-shared-image__container img, " +
                ".feed-shared-article__image img, " +
                ".feed-shared-carousel__content img"
            )
          )
            .flatMap((el) => {
              const delayed = el.getAttribute("data-delayed-url");
              if (delayed) return [delayed];

              const src = el.getAttribute("src");
              if (src) return [src];

              const srcset = el.getAttribute("srcset");
              if (srcset) {
                return srcset
                  .split(",")
                  .map((s) => s.trim().split(" ")[0])
                  .slice(-1);
              }

              return [];
            })
            .filter(
              (url) =>
                url && url.includes("media.licdn.com") && !url.includes("emoji")
            );

          return {
            urn,
            description,
            images,
            likesText: likesLabel,
            commentsText,
          };
        });
      });

      console.log(`Found ${postsOnPage.length} posts on page`);

      for (const post of postsOnPage) {
        if (!post.urn || collected.size >= maxPosts) continue;

        const existing = collected.get(post.urn);

        collected.set(post.urn, {
          urn: post.urn,
          description: post.description || existing?.description || "",
          images:
            post.images.length > 0
              ? [...new Set(post.images)]
              : existing?.images || [],
          likesCount: parseLikeCount(post.likesText),
          commentsCount: parseCount(post.commentsText),
        });

        console.log(
          `✅ Collected post (${collected.size}):`,
          post.images.length,
          "images"
        );
      }

      if (collected.size >= maxPosts) break;

      const prevCount = await page.evaluate(
        () =>
          document.querySelectorAll('div[data-urn^="urn:li:activity"]').length
      );

      await page.evaluate(() => {
        const scrollAmount = window.innerHeight * (1.5 + Math.random() * 0.5);
        window.scrollBy(0, scrollAmount);
      });

      await delay(randomDelay());

      try {
        // Playwright waitForFunction
        // Arguments: function, arg, options
        await page.waitForFunction(
          (count) =>
            document.querySelectorAll('div[data-urn^="urn:li:activity"]')
              .length > count,
          prevCount, // Argument passed to function
          { timeout: 15000 } // Options
        );
      } catch (err) {
        console.log("⚠️ No new posts loaded, ending scroll");
        break;
      }
    }

    console.log("✅ Scraping completed!");

    const postsArray = Array.from(collected.values());
    
    if (postsArray.length === 0) {
      console.log("⚠️ No posts were collected from this profile.");
    }

    return {
      username: getUsername(profileUrl),
      posts: postsArray,
    };
  } catch (error) {
    if (error instanceof VerificationError) {
      console.log("⚠️ Verification needed, pausing session...");
      verificationNeeded = true;
      throw error;
    }
    console.error("❌ Error during scraping:", error.message);
    throw error;
  } finally {
    // Only close browser if:
    // 1. We created it (not passed in as existingBrowser)
    // 2. AND verification is not needed (browser must stay open for OTP)
    if (browser && createdBrowser && !verificationNeeded) {
      await browser.close();
      console.log("🔒 Browser closed");
    } else if (verificationNeeded) {
      console.log("🔓 Browser kept open for verification");
    } else if (!createdBrowser) {
      console.log("🔄 Browser not closed (was passed in by caller)");
    }
  }
}
