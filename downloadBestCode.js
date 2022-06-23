const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const prompt = require('prompt-sync')();

const submissionUrl = "https://acm.cs.nthu.edu.tw/status/view_code";
const listUrl = "https://acm.cs.nthu.edu.tw/status";

const userPrefix = "TEAM";
const problem = prompt("Problem ID:");

const {csrftoken, sessionid} = require("./env.json")
// const user = prompt('Username: ');
// const pass = prompt('Password: ');
// const login = () => {
//     return new Promise(async(res, rej) => {
        
//     });
// };

const language2Filename = (x) => {
    x = x.toLowerCase();
    if (x.indexOf("c++") !== -1)
        return "cpp";
    if (x.indexOf("java") !== -1)
        return "java";
    if (x.indexOf("python") !== -1)
        return "py";
    return "c";
}

const getUserCode = (sid) => {
    return new Promise(async(res, rej) => {
        let config = {
            method: 'get',
            url: `${submissionUrl}/${sid}`,
            headers: {
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0",
                "Content-Type": "application/json",
                "Cookie": `csrftoken=${csrftoken};sessionid=${sessionid}`
            }
        };
        req = await axios(config);
        const $ = cheerio.load(req.data);
        const code = $("textarea.form-control").text();
        res(code);
    })
}
const getSubmissions = (pid, pages, users) => {
    return new Promise(async(res, rej) => {
        let config = {
            method: 'get',
            url: `${listUrl}/?pid=${pid}&page=${pages}`,
            headers: {
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0",
                "Content-Type": "application/json",
                "Cookie": `csrftoken=${csrftoken};sessionid=${sessionid}`
            }
        };
        console.log(config.url)
        req = await axios(config);
        const $ = cheerio.load(req.data);
        // let users = {}
        $("table.table").find("tbody > tr").each((idx, ele) => {
            const list = $(ele).find("td").toArray();
            const sid = $(list[0]).text().replace(/\s/g,'');
            const userid = $(list[2]).text().replace(/\s/g,'');
            const status = $(list[4]).text().replace(/\s/g,'');
            const language = $(list[5]).text().replace(/\s/g,'');
            if (userid.indexOf(userPrefix) === 0) {
                const spl = status.split(/[(/)]/i);
                if (spl.length > 3) {
                    const score = parseInt(spl[1]);
                    if (score > 0) {
                        if (userid in users) {
                            if (users[userid].score < score) {
                                users[userid] = {
                                    submission: sid,
                                    score: score,
                                    language: language
                                }
                            }
                        }else {
                            users[userid] = {
                                submission: sid,
                                score: score,
                                language: language
                            }
                        }
                    }
                }
            }
        });
        res(users);
    })
}
const getSubmissionPages = (pid) => {
    return new Promise(async(res, rej) => {
        let config = {
            method: 'get',
            url: `${listUrl}/pages?pid=${pid}`,
            headers: {
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0",
                "Content-Type": "application/json",
                "Cookie": `csrftoken=${csrftoken};sessionid=${sessionid}`
            }
        };
        // console.log(config.url)
        req = await axios(config);
        const pages = parseInt(req.data.pages);
        res(pages);
    });
}
// getSubmissionPages(11417)
const dir = path.join(__dirname, problem);
if (fs.existsSync(dir)) {
    console.log(`Directory ${dir} exists!!!!!`);
}else {
    fs.mkdirSync(dir);
    (async() => {
        const pages = await getSubmissionPages(problem);
        let users = {};
        for (let i = pages; i > 0; i--) {
            users = await getSubmissions(problem, i, users);
        }
        for (const userid in users) {
            getUserCode(users[userid].submission).then((code) => {
                const score = users[userid].score;
                const filename = `${userid}-${score}.${language2Filename(users[userid].language)}`;
                fs.writeFile(path.join(dir, filename), code, err => {
                    if (err) {
                        console.error(err);
                    }
                });
            });
        }
    })();
}
// getSubmissions(13475, 1).then((users) => {
//     console.log(users)
// })
