[README.md](https://github.com/user-attachments/files/34512649/README.md)
# iPad Mini Gym & Work Dashboard 🏋️‍♂️⏱️

A high-contrast, mobile-first web dashboard designed specifically for older tablets (like the iPad Mini 4 running iOS 15) to serve as a wall-mounted desk clock, dead hang / workout timer, local weather widget, and nightly synced to-do list viewer.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20iPadOS%20%7C%20Web-black.svg)

---

## ✨ Features

- 🕒 **Commercial-Style Gym Clock:** Large, high-contrast digital wall clock display (`HH:MM:SS`) readable from across the room. Supports 12-hour and 24-hour modes.
- ⏱️ **Dead Hang Stopwatch with 5-Second Delay:** Dedicated stopwatch featuring a 5-second "GET READY" countdown timer with synthetic audio beeps before timing starts, giving you time to reach the bar or get into position.
- 🔀 **Sliding Mode Switch & Customizable Labels:** Seamless switch between Clock and Stopwatch modes. Press and hold (or double-click) mode labels to rename them to your liking (e.g., *Desk Clock*, *Plank Timer*).
- ⛅ **Live Weather Integration:** Displays current temperature, high/low range, and condition icons using the free Open-Meteo API (with automatic fallback to default coordinates if geolocation is disabled).
- 📋 **Grouped To-Do Lists:** Categorized columns (**Work**, **FinTech**, **Personal**) with touch-friendly checkboxes and task completion counters.
- 🔄 **GitHub Gist Nightly Sync:** Auto-syncs every 60 seconds from a raw JSON URL (e.g., a Secret GitHub Gist) updated from your phone or laptop.
- 📱 **iOS Web App Ready:** Includes full-screen web clip meta tags (`apple-mobile-web-app-capable`) so it runs without Safari headers/footers when added to the iPad Home Screen.

---

## 🚀 Quick Setup & Installation

### Option 1: Deploy with GitHub Pages (Recommended)

1. **Fork or Clone this repository:**
   ```bash
   git clone https://github.com/your-username/home-gym-dashboard.git
   ```
2. **Enable GitHub Pages:**
   * Go to **Settings > Pages** in your GitHub repository.
   * Under **Branch**, select `main` and click **Save**.
   * Your dashboard will be live at `https://<your-username>.github.io/home-gym-dashboard/`.

---

## 📋 Configuring Your To-Do List (GitHub Gist)

To update your daily tasks remotely from your phone or laptop:

1. Go to [gist.github.com](https://gist.github.com/).
2. Create a **Secret Gist** named `tasks.json` with the following structure:
   ```json
   {
     "Work": [
       "Review PRs & deploy staging",
       "Sync with development team"
     ],
     "FinTech": [
       "Verify daily trade logs",
       "Check risk metrics"
     ],
     "Personal": [
       "Dead hangs: 4 x 60s",
       "30 min mobility & stretch"
     ]
   }
   ```
3. Click **Create secret gist**.
4. Click the **Raw** button at the top right of the file block and copy the URL.
5. On your iPad Dashboard, tap **Fetch Tasks URL**, paste the raw Gist URL, and tap **Load Tasks**.
   > **Note:** The dashboard saves this URL in local storage and auto-refreshes your tasks every 60 seconds.

---

## 📲 Setting Up on iPad Mini (Kiosk Mode)

1. Open your GitHub Pages URL (`https://<your-username>.github.io/home-gym-dashboard/`) in **Safari** on the iPad.
2. Tap the **Share** button (<i class="fa-solid fa-square-arrow-up"></i>) and select **Add to Home Screen**.
3. Name it **Gym Dashboard** and tap **Add**.
4. Launch the application from your iPad Home Screen. It will open in **full-screen standalone mode** without address bars.
5. **(Optional) Lock into Kiosk Mode:**
   * Go to **Settings > Accessibility > Guided Access**, and turn it **On**.
   * Open the Dashboard app and **triple-click the Home button** to lock the iPad onto the dashboard.

---

## 🛠️ Built With

- **HTML5 & Vanilla JavaScript** (Zero build steps, ultra-lightweight)
- **Tailwind CSS** (via CDN)
- **FontAwesome 6** (for icons)
- **Open-Meteo API** (Free weather data endpoint)
- **Web Audio API** (For countdown beep sounds without external audio file dependencies)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
