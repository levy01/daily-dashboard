# Sharing the dashboard with someone else

Every person gets **their own private Google Sheet and script**. Nobody else can see their tasks. Everyone can use
the same dashboard page (`https://levy01.github.io/daily-dashboard/`): the page only remembers the connection
details on that person's own device.

## For the person sharing (one-time: make the template)
1. Create a new Google Sheet named **Daily Dashboard (template)**.
2. **Extensions > Apps Script**, paste in all of `Code.gs`, save.
3. Reload the Sheet, then **Dashboard > Set up / repair this sheet** and approve the prompt.
   This creates the empty **Tasks** and **Settings** tabs. Do not add any tasks.
4. **Do not deploy it.** Do not run Show connection info (it adds a key and URL to the original only; copies
   never inherit those, but there is no reason to risk it).
5. **Share** the Sheet: General access > Anyone with the link > **Viewer**.
6. Take the Sheet's link, which looks like `https://docs.google.com/spreadsheets/d/<ID>/edit`, and change
   `edit` at the end to `copy`:

   `https://docs.google.com/spreadsheets/d/<ID>/copy`

   Send that link. Opening it asks the person to **Make a copy**, which includes the script.

Keep the template clean. Update it (paste a newer `Code.gs`) when the app changes; people who already made copies
must paste the new `Code.gs` into their own copy and redeploy a new version to get the changes.

## For the new person (about 10 minutes)
1. Open the copy link you were sent and click **Make a copy**.
2. In your copy: **Extensions > Apps Script**. In the toolbar pick **`setup`** and click **Run**. Approve the
   permission prompts: Review permissions > your account > **Advanced > Go to ... (unsafe) > Allow**.
   (Google shows "unverified" because it is your own script, not a published app.)
3. **Deploy > New deployment > Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy, then copy the
   **Web app URL** (ends in `/exec`).
4. Back in the Sheet, reload, then **Dashboard > Show connection info**, paste the URL. Click the pairing link it
   shows: the dashboard opens already connected. Open the same link on other devices to pair them.
5. Optional: **Dashboard > Test news feed** and approve the extra permission so the news popup works.
6. Rename sections with the pencil icon, set weather coordinates, clock colour and news topics on the **Settings** tab.

## Good to know
- Each person's Google account runs their own script, so quota limits are per person and far above normal use.
- Anyone holding a person's pairing link can read and change that person's tasks. **Dashboard > Rotate secret key**
  makes the old link stop working.
- The script is yours until someone changes it: copies do not update automatically.
- Hosting your own page instead of the shared one: put `index.html` and `sw.js` on any static host, and change
  `DASHBOARD_URL` at the top of `Code.gs` to that address.
