## Prerequisites
**CRITICAL:** You must run both the frontend and backend for the app to work.
Run this command in your terminal:
```bash
npm run start:all
```
*(If you are currently running `npm run dev`, stop it with Ctrl+C and run `npm run start:all` instead)*

## 1. Fix Themes
I have updated the code to fully support the theme system. You should now see the colors change instantly when you select a theme in the Config panel.

**Verify:**
1. Go to the **Config** tab in the app.
2. Click on "Midnight Blue" or "Emerald".
3. The entire application background, text, and borders should change colors.
4. Refresh the page to ensure the selection is saved.

## 2. Test Metrics (Dummy Data)
To see the metrics dashboard come alive with data, run the seed script in Supabase.

**Steps:**
1. Open `scripts/seed_metrics.sql` in your editor.
2. Copy the entire content.
3. Go to the [Supabase SQL Editor](https://supabase.com/dashboard).
4. Paste the SQL and click **Run**.
5. Go back to your app Dashboard.
6. You should see:
   - **Refund Rate**: 20%
   - **Completion Rate**: 60%
   - **Avg Latency**: ~466ms

## 3. Real-time Updates
The dashboard refreshes every 30 seconds. You can also refresh the page to see the new data immediately.
