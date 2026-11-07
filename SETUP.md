# Dashboard setup (about 15 minutes)

You'll end up with one private Google Sheet holding your tasks, a small Apps Script in front of it,
and the dashboard page on GitHub Pages. The iPad, laptop and phone all talk to the same script.

## 1. Create the Sheet and add the script
1. Create a new Google Sheet (name it anything, e.g. "Dashboard").
2. **Extensions > Apps Script**. Delete the starter code and paste in all of `Code.gs`. Save.
3. Back in the Sheet, reload the page. A **Dashboard** menu appears.
4. **Dashboard > Set up / repair this sheet**. Approve the permission prompt
   ("Google hasn't verified this app" is expected for your own script: Advanced > Go to ... (unsafe)).
   This creates the **Tasks** and **Settings** tabs and a secret key.

## 2. Deploy it as a web app
1. In Apps Script: **Deploy > New deployment > Web app**.
2. Execute as: **Me**. Who has access: **Anyone**. Deploy.
   (The URL is public but useless without your key.)
3. Back in the Sheet: **Dashboard > Show connection info**. You'll see the **API URL** (ends in `/exec`)
   and the **Key**. Keep that window handy.

When you later change `Code.gs`, redeploy with **Deploy > Manage deployments > edit > New version**,
otherwise the live URL keeps running the old code.

## 3. Put the page on GitHub Pages
Replace `index.html` in your repo with the new one and add `sw.js` next to it. Commit and push.
(Your Pages address is `https://levy01.github.io/home-gym-dashboard/`.)

## 4. Pair each device
- **Easiest:** open `https://levy01.github.io/home-gym-dashboard/#api=<URL-encoded API URL>&key=<KEY>`
  (the "Show connection info" window prints the exact `#api=...&key=...` part to append).
  The page saves it and removes it from the address bar.
- **iPad Home Screen app:** a Home Screen icon has its own storage, so after adding it, open it and tap the
  gear, paste the API URL and key, **Save & sync**. Do this once.
- Pair the laptop and phone the same way. Each can be disconnected any time with the gear > Forget.

## 5. iPad kiosk
Settings > Display & Brightness > Auto-Lock > **Never**. Keep it plugged in (a smart plug on a schedule is kind
to an old battery). Optional: Guided Access (Settings > Accessibility) and triple-click the home button
inside the app so stray swipes can't exit it.

## How it behaves
- **Tap a task** to check it off. It shows instantly, queues if you're offline, and syncs when you're back.
- **Carry-over:** unfinished tasks stay put and grow a badge: `1d` amber, `2d` orange, `3d+` red (the number keeps
  counting). Most overdue sits at the top of each column. Each header shows `N open · M carried`.
- **Finished tasks** stay struck-through for the rest of the day, then disappear (the row stays in the sheet as history).
- **Night-before entry:** tasks added at or after `evening_hour` (default 5pm) default to **Tomorrow**.
  They stay hidden on the kiosk until that day, and the footer shows "N queued for later".
- **Phone / laptop / iPad editing:** tap the pencil. Pick Today/Tomorrow, type in a column, Enter. Pencil and X
  on each task edit or delete it.
- **Typing straight into the Sheet** works too: just fill in Section and Task on the Tasks tab. ID, Day and
  Updated are filled in on the next sync. Don't reorder the header row.
- **Settings tab:** section names (up to 4), clock color, 12/24h, stopwatch delay, weather coordinates and units,
  night-dim hours, nightly reload time. Changes reach every device within a minute.

## Troubleshooting
- Status line says **wrong key**: re-copy the key from Dashboard > Show connection info (gear > paste).
- Says **bad response** or never syncs: the deployment is probably "Only me" or an old version. Re-check step 2.
- **Stale** (red): the device hasn't reached the script for 3+ minutes. Check Wi-Fi. Your taps are safe in the queue.
- Lost or leaked the key: **Dashboard > Rotate secret key**, then re-pair devices.
