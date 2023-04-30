const express = require('express');
const FireDAO = require('./fire_dao');
// console.log( { getUsers });
const LineParser = require('./line-parser');


const line = require('@line/bot-sdk');
const config = require('config');
const bodyParser = require('body-parser');

const line_config = {
  channelAccessToken: config.line.channel_access_token,
  channelSecret: config.line.channel_secret
};

const bypassLineAuth = config.line.bypass_auth;

// console.log( { line_config });


const app = express();

if (bypassLineAuth) {
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(bodyParser.raw());
}

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

app.get('/goal', async (req, res) => {
    const ymd = FireDAO.getYYYYMMDD(new Date());
    const goal = await FireDAO.getGroupGoal('C996d5d4179fbd44b3e272305f0bb691c', ymd);
    res.send({ goal : goal.id });
});

app.get('/users', async (req, res) => {
    console.log(' ==== getUsers() ===');
    const users = await FireDAO.getUsers();
    res.send(users);
    
});

const temp = (req, res, next) => {
    console.log({reqBody:JSON.stringify(req.body)});
    // console.log({reqHeaders:JSON.stringify(req.headers)});
    next();
    // res.send('temp');
}

// 接受 Line 傳訊息過來的入口。
if (!bypassLineAuth) {
    app.post('/webhook', temp, line.middleware(line_config), (req, res) => {
    // app.post('/webhook', temp , (req, res) => {
        console.log({ line_webhook_body: JSON.stringify(req.body)});
        Promise
            .all(req.body.events.map(handleEvent))
            .then((result) => res.json(result));
    });
} else {
    app.post('/webhook', temp , (req, res) => {
        console.log({ line_webhook_body: JSON.stringify(req.body)});
        Promise
            .all(req.body.events.map(handleEvent))
            .then((result) => res.json(result));
    });
}

const client = new line.Client(line_config);

// 真正處理 Line 傳過來訊息的 function
async function handleEvent(event) {
    console.log(` handle line events: ${JSON.stringify(event)}`);
    // 事件類型必須是 message 或 text 才處理。
    if (event.type !== 'message' || event.message.type !== 'text') { 
        return Promise.resolve(null);
    }
    
    // 取得 Line 訊息解析器，解析使用者指令，並決定如何回覆？
    const parser = new LineParser(event, config.get('line.channel_access_token'));
    const result = await parser.parseText();
    console.log( { result });

    if (bypassLineAuth) {
        return result ;
    } else {
        // 如果有內容需要回覆，則回復到群裡。
        if (result) {
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: result
            });
        }
    }
}


const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`helloworld: listening on port ${port}`);
});
