# Sharing the dashboard with someone else

Every person gets **their own private Google Sheet and script**. Nobody else can see their tasks. Everyone can use
the same dashboard page (`https://levy01.github.io/daily-dashboard/`): the page only remembers the connection
details on that person's own device.

## For the person sharing (one-time: make the template)
1. Create a new Google Sheet named **Daily Dashboard (template)**.
2. **Extensions > Apps Script**, paste in all of `Code.gs`, save.
3. **Do not run Set up, deploy it, or add any tasks.** Set up creates a secret key inside the script, and the
   template should never have one. The new person's own Set up creates their tabs and their own key.
4. Optional check: reload the Sheet and confirm a **Dashboard** menu appears. That proves the script saved.
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

## Spanish-speaking users
The dashboard, the news, and the Sheet menu all have a Spanish mode. After their copy is set up, the person runs
**Dashboard > Usar español** (there is also **Use English**). That sets `language` on the Settings tab, switches the news to
Google News in Spanish with Spanish topics, and, if there are no tasks yet, renames the default sections to
Trabajo / Personal / Compras. The pairing link carries the language, so the dashboard is Spanish from the first screen.
Send them `CONFIGURACION-ES.md`, a Spanish version of the steps above.

## Setting it up for someone else (a caretaker setting up for an older person)
The caretaker does the one-time setup on their own computer, then connects the other person's tablet by scanning.
1. Make the copy and run the setup steps above **on the caretaker's computer, signed in to the Google account that
   will own the dashboard** (the older person's account, or the caretaker's own: whichever should hold the tasks).
2. **Dashboard > Show connection info** shows a **QR code**. On the tablet, open the **Camera** app, point it at the
   screen, tap the banner that appears. The dashboard opens already connected, in the right language.
3. Leave the dashboard open in Safari and set Settings > Display & Brightness > Auto-Lock to **Never** (and keep the
   tablet plugged in). If you add it to the Home Screen instead, that icon has its own storage: open it, tap the gear,
   and paste the pairing link into the first field once (send the link to the tablet by email or Messages, then
   long-press and Copy). Pairing in Safari does not carry over to the icon.
4. The caretaker can later add or edit tasks from their own phone or laptop (same QR/link), or by typing straight
   into the Sheet. The tablet picks changes up within a minute.
5. Keep the QR code and pairing link private, since they give access to the tasks.

## Good to know
- Each person's Google account runs their own script, so quota limits are per person and far above normal use.
- Anyone holding a person's pairing link can read and change that person's tasks. **Dashboard > Rotate secret key**
  makes the old link stop working.
- The script is yours until someone changes it: copies do not update automatically.
- Hosting your own page instead of the shared one: put `index.html` and `sw.js` on any static host, and change
  `DASHBOARD_URL` at the top of `Code.gs` to that address.
