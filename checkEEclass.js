const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const Diff = require("diff");
const prompt = require('prompt-sync')();

const submissionUrl = "https://acm.cs.nthu.edu.tw/status/view_code";
const listUrl = "https://acm.cs.nthu.edu.tw/status";

const userPrefix = "TEAM";
const problem = prompt("Problem ID:");

const {csrftoken, sessionid} = require("./env.json")

const userList = path.join(__dirname, "user.txt");
let status = {
    0: [],
    1: [],
    2: [],
    3: []
}
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

const fuzzyCheck = (oj, eeclass) => {
    oj = oj.replaceAll(" ", "");
    oj = oj.replaceAll("\r", "");
    oj = oj.split("\n");
    let sameOJ = 0, sameEEclass = 0;
    // console.log(oj, eeclass);
    for (let ele in eeclass) {
        if (oj.indexOf(eeclass[ele]) !== -1)
            sameEEclass++;
    }
    for (let ele in oj) {
        if (eeclass.indexOf(oj[ele]) !== -1)
            sameOJ++;
    }
    // console.log(sameEEclass, sameOJ);
    if (sameOJ >= oj.length * 0.9 && sameEEclass >= eeclass.length * 0.9)
        return true;
    return false;
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
const getSubmissions = (teamid, pid, pages, find, eeclassCode) => {
    return new Promise(async(res, rej) => {
        let config = {
            method: 'get',
            url: `${listUrl}/?username=${teamid}&pid=${pid}&page=${pages}`,
            headers: {
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0",
                "Content-Type": "application/json",
                "Cookie": `csrftoken=${csrftoken};sessionid=${sessionid}`
            }
        };
        // console.log(config.url)
        req = await axios(config);
        const $ = cheerio.load(req.data);
        // let users = {}
        tmp = [];
        $("table.table").find("tbody > tr").each((i, ele) => {
            const list = $(ele).find("td").toArray();
            const sid = $(list[0]).text().replace(/\s/g,'');
            const userid = $(list[2]).text().replace(/\s/g,'');
            tmp.push({sid: sid, userid: userid});
        });
        for (let i = 0; i < tmp.length; i++) {
            const {sid, userid} = tmp[i];
            if (userid.indexOf(teamid) === 0) {
                let code = await getUserCode(sid);
                code = code.replaceAll(" ", "");;
                code = code.replaceAll("\r", "");;
                // console.log(code);
                // console.log(Diff.diffTrimmedLines(code, eeclassCode));
                if (fuzzyCheck(code, eeclassCode)) {
                    find = sid;
                }
            }
        };
        res(find);
    })
}
const getUserSubmissionsPages = (teamid, pid) => {
    return new Promise(async(res, rej) => {
        let config = {
            method: 'get',
            url: `${listUrl}/pages?username=${teamid}&pid=${pid}`,
            headers: {
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0",
                "Content-Type": "application/json",
                "Cookie": `csrftoken=${csrftoken};sessionid=${sessionid}`
            }
        };
        // console.log(config.url)
        try {
            req = await axios(config);
            const pages = parseInt(req.data.pages);
            res(pages);
        } catch {
            // cnt2++;
            // console.log(`404 for ${teamid}`);
            res(0);
        }
    });
}
let cnt1, cnt2;
const checkUser = async (team, id, problem) => {
    const codepath = path.join(__dirname, problem, `${problem}_${id}.cpp`);
    let code = "";
    try {
        code = fs.readFileSync(codepath, 'utf8').replaceAll("\r", "");
        code = code.replaceAll(" ", "");
        code = code.split("\n");
    } catch (e) {
        console.log(`Student ${id} ${team} submission not found in eeClass`);
        // return;
        code = "---";
    }
    const pages = await getUserSubmissionsPages(team, problem);
    let find = -2;
    // console.log(code);
    for (let i = 1; i <= pages; i++) {
        find = await getSubmissions(team, problem, pages, find, code);
    }
    if (find > 0) {
        status[0].push(`${id}:${team} - ${find}`);
        // console.log(`${id}:${team} found code in submission id ${find}`);
    }else if (code === "---") {
        if (find === -2)
            status[1].push(`${id}:${team}`);
            // console.log(`${id}:${team} didn't submit code to both eeClass and OJ`);
        else
            status[2].push(`${id}:${team}`);
            // console.log(`!!!!!!!!!!!!!!!!!!!!!!!!\n${id}:${team} submitted code to OJ but not found on eeClass`);
    }else {
        status[3].push(`${id}:${team}`);
        // console.log(`!!!!!!!!!!!!!!!!!!!!!!!!\n${id}:${team} submitted code to eeClass but not found on OJ`);
    }
    cnt2++;
};
// getSubmissionPages(11417)
// const dir = path.join(__dirname, problem);
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
try {
    let users = fs.readFileSync(userList, 'utf8');
    users = users.split("\n");
    cnt1 = cnt2 = 0;
    users.forEach(async (ele, ind) => {
        cnt1++;
        // ele = "110062343:TEAM816";
        const spl = ele.split(":");
        await sleep(ind * 150);
        try {
            const id = spl[0];
            const team = spl[1];
            if (team.length === 0) {
                throw `Student ${id} doesn't have team number`;
            }
            checkUser(team, id, problem);
        } catch(e) {
            cnt2++;
            console.log(e);
        }
    })
} catch (err) {
    console.error(err);
}
    (async() => {
        let cc = 40;
        while (cc >= 0) {
            await sleep(1000);
            if (cnt1 === cnt2) {
                break;
            }
            cc--;
        }
        console.log("--------------------------")
        console.log(`Found code in submission`);
        status[0].forEach((e) => console.log(e));
        console.log("--------------------------")
        console.log(`Didn't submit code to both eeClass and OJ`);
        status[1].forEach((e) => console.log(e));
        console.log("--------------------------")
        console.log(`Submitted code to OJ but not found on eeClass`);
        status[2].forEach((e) => console.log(e));
        console.log("--------------------------")
        console.log(`Submitted code to eeClass but not found on OJ`);
        status[3].forEach((e) => console.log(e));
        console.log(`Student count: ${cnt1}`)
        console.log(`Reports collected: ${cnt2}`)
    })();

// if (fs.existsSync(dir)) {
//     console.log(`Directory ${dir} exists!!!!!`);
// }else {
//     fs.mkdirSync(dir);
//     (async() => {
//         const pages = await getSubmissionPages(problem);
//         let users = {};
//         for (let i = pages; i > 0; i--) {
//             users = await getSubmissions(problem, i, users);
//         }
//         for (const userid in users) {
//             getUserCode(users[userid].submission).then((code) => {
//                 const score = users[userid].score;
//                 const filename = `${userid}-${score}.${language2Filename(users[userid].language)}`;
//                 fs.writeFile(path.join(dir, filename), code, err => {
//                     if (err) {
//                         console.error(err);
//                     }
//                 });
//             });
//         }
//     })();
// }
