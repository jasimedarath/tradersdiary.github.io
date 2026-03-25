# Swing Trade Tracker

This version is prepared for GitHub Pages so you can open it from your phone.

## Recommended setup

Use:

- GitHub Pages for hosting the app
- Supabase for login and cloud storage

This is much better than a hardcoded username/password because a hardcoded client-side password is visible to anyone who opens the site code. I left a demo login mode in `config.js` only as a temporary fallback.

## Files to edit

- [config.js](C:\Users\Jasim Edarath\Documents\New project\config.js): your active configuration
- [config.example.js](C:\Users\Jasim Edarath\Documents\New project\config.example.js): template with placeholders
- [supabase/schema.sql](C:\Users\Jasim Edarath\Documents\New project\supabase\schema.sql): database table and security rules

## Quick start

1. Create a free Supabase project.
2. In Supabase SQL Editor, run [schema.sql](C:\Users\Jasim Edarath\Documents\New project\supabase\schema.sql).
3. In Supabase Authentication, create your user email/password.
4. Update [config.js](C:\Users\Jasim Edarath\Documents\New project\config.js):
   - Set `authMode` to `"supabase"`
   - Add your Supabase project URL
   - Add your Supabase anon key
5. Push this project to GitHub.
6. Enable GitHub Pages for the repo.
7. Open the GitHub Pages URL on desktop or phone and sign in.

## Demo mode

If you keep `authMode: "demo"` in [config.js](C:\Users\Jasim Edarath\Documents\New project\config.js), the login screen uses the hardcoded username/password from that file.

Important:

- Demo mode is not secure
- Demo mode stores data only in that browser
- Demo mode is not suitable if you want phone + desktop sync

## Export

The app can export:

- JSON
- CSV for Excel

## Local preview

Because the app uses ES modules, preview it with a simple static server instead of opening the file directly.

One easy option:

`node --input-type=module -e "import('node:http').then(({createServer}) => createServer((req,res)=>import('node:fs').then(fs=>import('node:path').then(path=>{let file=path.join(process.cwd(),req.url==='/'?'index.html':req.url.split('?')[0]);fs.readFile(file,(err,data)=>{if(err){res.statusCode=404;res.end('Not found');return;}res.end(data);});}))).listen(4173))"`

Then open:

`http://localhost:4173`
