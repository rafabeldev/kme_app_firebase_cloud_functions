const functions = require('firebase-functions');
const admin = require('firebase-admin');
 
admin.initializeApp(functions.config().functions);
 
// var newData;
 
// exports.notifyNewMessage = functions.firestore.document('notifications/{id}').onCreate(async (snapshot, context) => {
//     //
//     if (snapshot.empty) {
//         console.log('No Devices');
//         return;
//     }
    
//     // Get data from snapshot
//     let newData = snapshot.data();

//     console.log('this is the new data',newData)
 
//     // const deviceIdTokens = await admin
//     //     .firestore()
//     //     .collection('notifications')
//     //     .get();

//     // console.log('tokens', deviceIdTokens.docs)
 
//     var tokens = [];
 
//     for (var token of deviceIdTokens.docs) {
//         tokens.push(token.data().device_token);
//     }
//     var payload = {
//         notification: {
//             title: 'Push Title',
//             body: 'Push Body',
//             sound: 'default',
//         },
//         data: {
//             // push_key: 'Push Key Value',
//             key1: newData.data,
//             seen: false,
//             date: new Date(),
//             photoUrl: 'http://mispolainas.com',
//             senderId: "jaishdfpa",
//             receiverId: "CuGDCIopoiGBn"

//         },
//     };
 
//     try {
//         // admin.messaging().
//         const response = await admin.messaging().sendToDevice(tokens, payload);
//         console.log('Notification sent successfully');
//     } catch (err) {
//         console.log(err);
//     }
// });



// j;alskdfj;laksdj;f
exports.notifyNewMessage = functions.firestore
  .document("/notifications/{id}")
  .onCreate((docSnapshot, context) => {
    const message = docSnapshot.data();
    const title = docSnapshot.data()["title"];
    const body = message["body"];
    const photoUrl = message["photoUrl"];
    const senderId = message["senderId"];
    const receiverId = message["receiverId"];

    return admin
      .firestore()
      .doc("users/" + receiverId)
      .get()
      .then((userDoc) => {
        const registrationTokens = userDoc.get("deviceTokens");
        const payload = {
            notification: {
                title: title,
                body: body,
                image: photoUrl
            },
            data: {
                // push_key: 'Push Key Value',
                // key1: newData.data,
                seen: "false",
                date: `${new Date()}`,
                photoUrl: photoUrl,
                senderId: senderId,
                receiverId: receiverId
            },
        };

        return admin
          .messaging()
          .sendToDevice(registrationTokens, payload)
          .then((response) => {
            const stillRegisteredTokens = registrationTokens;

            response.results.forEach((result, index) => {
              const error = result.error;
              if (error) {
                const failedRegistrationToken = registrationTokens[index];
                console.error(
                  `Ha ocurrido un error al registrar el token de usuarios: ${failedRegistrationToken} ${error}`
                );
                if (
                  error.code === "messaging/invalid-registration-token" ||
                  error.code ===
                    "messaging/invalid-registration-token-not-registered"
                ) {
                  const failedIndex = stillRegisteredTokens.indexOf(
                    failedRegistrationToken
                  );
                  if (failedIndex > -1) {
                    stillRegisteredTokens.splice(failedIndex, 1);
                  }
                }
              }
            });
            return admin
              .firestore()
              .doc("users/" + receiverId)
              .update({
                deviceTokens: stillRegisteredTokens,
              });
          });
      });
  });

