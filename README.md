# Scraping Backend - Local Setup Guide

This backend is designed to run locally on your machine to avoid Render's memory limits. Uses Playwright for LinkedIn scraping.

## 🚀 How to Run

1.  **Install Dependencies** (First time only):

    ```bash
    npm ci
    ```

2.  **Start the Backend**:

    ```bash
    npm start
    ```

    _Keep this terminal open._

3.  **Start Public Tunnel (Ngrok)**:
    In a **new** terminal window:

    ```bash
    ./ngrok http 5000
    ```

    _Keep this terminal open too._

4.  **Copy the URL**:
    Ngrok will show a URL (e.g., `https://abcd-1234.ngrok-free.app`).
    **Copy this URL into your Frontend configuration.**

---

## ⚠️ Important: Ngrok Warning Page

When you use the free version of Ngrok, the first time you visit the URL, it shows a **Blue Warning Page** ("You are about to visit...").

**This BLOCKS your Frontend from working** because the frontend gets the HTML warning page instead of JSON data.

### ✅ How to Fix It:

**Option 1 (Easiest)**:

1.  Open the Ngrok URL in your chrome browser.
2.  Click the **"Visit Site"** button.
3.  Your browser saves a cookie, and now it will work.

**Option 2 (Permanent Fix in Frontend)**:
Add this header to your `fetch` or `axios` requests in the Frontend:

```javascript
headers: {
  "ngrok-skip-browser-warning": "true"
}
```

---

## 🛠️ Troubleshooting

- **Browser Crashes/Restarts?**
  Ensure you have `--disable-dev-shm-usage` in launch args (already added).
- **Verification Required?**
  If the logs show "Verification Code Required", check the Frontend UI for an input box to enter the code sent to your email.
