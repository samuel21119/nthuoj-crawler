# NTHUOJ crawler
Download the **first best** code of each user from nthuoj.



## Run
- `npm i` : install dependencies
- `cp env.json.sample env.json`: copy sample env.json
- Edit `csrftoken` and `sessionid` in `env.json` to match your current login cookies
- `node downloadBestCode.js`: run download script
