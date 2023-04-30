const fetch = require('node-fetch');
var admin = require("firebase-admin");
var serviceAccount = require("./config/serviceAccountKeys.json");
const config = require('config');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


class FireDAO {
    static db = admin.firestore();

    static async  getUsers() {
        console.log(' ==== getUsers() ===');
        const result = [];
        const userRef = FireDAO.db.collection('users');
        const querySnapshot = await userRef.get();
        querySnapshot.forEach( doc => {
            console.log( doc.data());
            result.push(doc.data());
        });
        return result ;
    }
    
        
    static async getUserInfo( userID) {

        const bearer = `Bearer ${ config.line.channel_access_token }`;
        const targetUrl = `https://api.line.me/v2/bot/profile/${userID}` ;
        // console.log( { userID , lineAccessToken: config.line.channel_access_token, bearer, userID, targetUrl });
        const refUser = await FireDAO.db.collection('users').doc(userID);
        const doc = await refUser.get();
        // 如果使用者資料不存在 Firestore 上，則：
        if (!doc.exists) {
            // 從 Line 取得使用者資料，並更新到 Firestore 上
            try{
                // console.log('begin fetch user info...');
                const response = await fetch(targetUrl, {
                    method: "GET",
                    headers: {
                        Authorization: bearer,
                    },
                });
                // console.log('after fetch user info..., begin get user json data.');
                const userInfo = await response.json();
                // console.log({ userInfo });
                // 更新到 Firestore
                refUser.set( userInfo );
            } catch (ex) {
                console.log({ ex });
                return ;
            }
        }
    
        // 從 Firestore 取得使用者資料
        // console.log("=== get UserInfo from firestore ===")
        let promise = new Promise( function (resolve, reject) {
            refUser.onSnapshot(docSnapshot => {
                resolve(docSnapshot.data());
            }, err => {
                reject(err);
            });
        })
        return promise ;
    }

    /** 取得指定群組在指定月份的目標 */
    static async getGroupGoal( groupID, ymd) {
        // console.log( { groupID, ymd });
        
        // const doc = await (await FireDAO.db.collection('goals').doc(groupID).collection('goal').doc(ym).get()).data();
        // console.log( { doc });
        const tempGoals = await FireDAO.db.collection('goals').doc(groupID).collection('goal').get();
        
        let goal ;
        tempGoals.forEach(g => {
            const d = g.data();
            // console.log({ g: d, start_date: (d.start_date <= ymd  && d.end_date >= ymd) });
            if ( d.start_date <= ymd && d.end_date >= ymd  ) {
                goal = g ;
            }
        })

        return goal ;
    }

    /** 取得指定使用者，在指定群組、指定月份的加點紀錄 */
    static async getMyLog( userID, groupID, ym) {
        // console.log( { groupID, ym });
        const userLogs =  await FireDAO.db.collection('logs').where('userID', '=', userID).where('ym', '=', ym).where('groupID', '=', groupID).get()
        const result = [];
        userLogs.forEach( log => {
            result.push(log.data());
        })
        // console.log( { doc });
        return result ;
    }

    static async addPoints( userID, userName, groupID, point, ymd) {
        // 1. 紀錄 log，判斷是否已經存在，如果已經存在，則新增，否則修改。
        const key = `${userID}-${groupID}-${ymd}`;
        const ym = ymd.substring(0,6);
        const name = userName || '';
        const theGoal = await FireDAO.getGroupGoal(groupID, ymd);
        await FireDAO.db.collection('logs').doc(key).set( {
            userID,
            userName: name,
            groupID,
            point,
            ymd,
            ym,
            goalID: theGoal.id ,
            timestamp: new Date()
        })

        // 2. 計算此人在此月的總時數，並更新到 goals 裏面
        const userLogs =  await FireDAO.db.collection('logs').where('userID', '=', userID).where('goalID', '=', theGoal.id).get()
        let personalPoints = 0;
        userLogs.forEach( log => {
            personalPoints += log.data().point ;
        })

        const currentGoal  = await FireDAO.db.collection('goals').doc(groupID).collection('goal').doc(theGoal.id);
        await currentGoal.collection('contributors').doc(userID).set({
            userID,
            name,
            groupID,
            point: personalPoints,
            timestamp: new Date()
        });

        // 3. 計算 此群組在本月的狀態
        const contributors  = await FireDAO.db.collection('goals').doc(groupID).collection('goal').doc(currentGoal.id).collection('contributors').get();
        let groupPoints = 0;
        contributors.forEach(u => {
            const ud = u.data();
            // console.log({ ud });
            groupPoints += ud.point ;
        });
        const tempGoal = await (await currentGoal.get()).data();
        const initValue = tempGoal.init_value || 0;
    
        tempGoal.current= groupPoints + initValue 
        
        tempGoal.init_value = initValue ;
        tempGoal.last_update = new Date();
        await currentGoal.set(tempGoal);

        return { ...tempGoal, personalPoints };
    }

    /** 取得指定日期的 YYYYMM 格式 */
    static getYYYYMM(dtOrig = new Date()) {
        const temp = FireDAO.getYYYYMMDD(dtOrig)
        return temp.substring(0, 6);
    }

    /** 取得指定日期的 YYYYMMDD 格式 */
    static getYYYYMMDD(dtOrig = new Date()) {
        const dt = dtOrig || new Date();
        const m = dt.getMonth() + 1 ;
        const d = dt.getDate();
        return `${dt.getFullYear()}${(m < 10) ? "0" + m : m}${(d < 10) ? "0" + d : d}`;
    }
    
}



module.exports = FireDAO