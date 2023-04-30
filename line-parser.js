const fetch = require('node-fetch');
const FireDAO = require('./fire_dao');

class LineEventParser {
    constructor(evt, channelAccessToken) {
        this.evt = evt ;
        this.channelAccessToken = channelAccessToken ;
        this.userID = this.getUserID();
        this.text = this.getText();
    }

    async parseText() {
        // console.log( "=== parseText ===")
        let result = '';
        // console.log({ text: this.text.substring(0,1)});
        let userInfo = { displayName: ''};
        try {
            // 1. 找出 userID 對應的使用者資料
            userInfo = await FireDAO.getUserInfo(this.userID);
            // console.log({ userInfo });
        } catch (ex) {
            console.log(`取得 userID: ${this.userID} 的身份資料時發生錯誤！, ex: ${JSON.stringify(ex)}`)
        }

        // 2. 解析動作 : 2/16 + 8
        console.log( "=== parseAction ===")
        // 2.1 從 + 號拆成左右兩邊，左邊是日期，右邊是點數
        const aryData = this.text.split("+");
        const now = new Date();
        const targetDate = new Date(`${now.getFullYear()}/${aryData[0]}`);
        const point = aryData[1].trim();
        console.log( { targetDate, point, text: this.text });

        // const point = this.text.trim().replace('+', '');
        if (this.text.indexOf('+') > -1) {
            console.log(' add point')
            const temp = await FireDAO.addPoints(this.userID, userInfo.displayName, this.getGroupID(), parseInt(point), FireDAO.getYYYYMMDD(targetDate));
            // console.log( { temp });
            // result = `${userInfo.displayName} 您今天已貢獻：${point} 點， 本月已貢獻：${temp.personalPoints} \r\n 本月目標：${temp.target}, 目前：${temp.current}`
            const goalStatus  = await FireDAO.getGroupGoal(this.getGroupID(), FireDAO.getYYYYMMDD(targetDate));
            console.log({ goalStatus });
            if (goalStatus) {
                const data = goalStatus.data();
                console.log({ target: data.target, current: data.current, reachGoal: (data.target < data.current)  })
                if(data.target >= data.current){
                    console.log({ goalStatus, deadline: data.end_date });
                    result = `目前群組已累計 ${data.current} 分鐘研讀時間，距離 ${data.end_date} 的${data.goal_name}目標還有 ${data.target - data.current} 分鐘達成！`
                } else{
                    result = `已經達成目標了`;
                }
            } else {
                result = `目前群組在(${FireDAO.getYYYYMM(targetDate)}) 尚未設定目標！`
            }
            // result = `本群組在(${FireDAO.getYYYYMM(targetDate)}) \r\n  目標：${goalStatus.target} 點, 目前：${goalStatus.current} 點。`

        } else if (this.text.substring(0,4).toLowerCase() === 'goal') {
            console.log('=== show goal ===');
            const temp  = await FireDAO.getGroupGoal(this.getGroupID(), FireDAO.getYYYYMMDD());
            // console.log({ temp });
            result = `本群組本月(${FireDAO.getYYYYMM()}) \r\n  目標：${temp.target} 點, 目前：${temp.current} 點。`
        } else if (this.text.substring(0,4).toLowerCase() === 'mine') {
            console.log('=== show my status this month ===');
            const logs  = await FireDAO.getMyLog(this.userID, this.getGroupID(), FireDAO.getYYYYMM());
            // console.log({ logs });
            const tempLogs = logs.map( log =>  `日期：${log.ymd}， 點數：${log.point}` );
            // console.log({ tempLogs });
            result = `${ userInfo.displayName || ''} 本月(${FireDAO.getYYYYMM()})貢獻 ${tempLogs.length} 次： \r\n ${ tempLogs.join("\r\n")}`;
            // console.log({ temp });
        }
        
        // console.log({ result });
        return result ;
        // return `${this.userID} - ${this.text}`;
    }

    getUserID() {
        return this.evt.source.userId ;
    }
    getGroupID() {
        return this.evt.source.groupId ;
    }
 
    getText() {
        return this.evt.message.text ;
    }

    // async addPoint(userInfo, point) {
    //     let promise = new Promise( (resolve, reject) => {
    //         // console.log({point});
    //         const result = `${userInfo.displayName}, you contribute ${ point } points` ; 
    //         resolve(result);
    //     }) ;
        
    //     return promise ;
    // }

    // async showInfo(userInfo) {
    //     let promise = new Promise( (resolve, reject) => {
    //         const result = `Our Goal : 50 points, \r\n Current : 30 points. \r\n You contribute 15 points.` ; 
    //         resolve(result);
    //     }) ;
        
    //     return promise ;
    // }

    /*
    async getUserInfo( userID) {
        console.log( { userID });
        const refUser = await db.collection('users').doc(userID);
        const doc = await refUser.get();
        // 如果使用者資料不存在 Firestore 上，則：
        if (!doc.exists) {
            // 從 Line 取得使用者資料，並更新到 Firestore 上
            const response = await fetch(`https://api.line.me/v2/bot/profile/${userID}`, {
                headers: {
                    Authorization: `Bearer ${this.channelAccessToken}`,
                }
            });
            const data = await response.json();
            // 更新到 Firestore
            refUser.set( userInfo);
        }

        // 從 Firestore 取得使用者資料
        let promise = new Promise( function (resolve, reject) {
            refUser.onSnapshot(docSnapshot => {
                resolve(docSnapshot.data());
            }, err => {
                reject(err);
            });
        })
        return promise ;
    }
*/
    // async syncUserInfo(userInfo) {
    //     const userId = userInfo.userId ;
    //     const refUser = await db.collection('users').doc(userId);
    //     const doc = await refUser.get();
    //     if (!doc.exists) {
    //         refUser.set( userInfo);
    //     }
    //     console.log( { doc }) ;
    //     // const docRef = colUsers.where
    //     // const docRef = db.collection('users').doc(userId);
        
    //     // await docRef.set( userInfo );
    // }
    
}

module.exports = LineEventParser

