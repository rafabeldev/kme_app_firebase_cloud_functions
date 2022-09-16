const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const app = express();
 
admin.initializeApp(functions.config().functions);

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));
 
exports.notifyNewMessage = functions.firestore
  .document("/notifications/{id}")
  .onCreate((docSnapshot, context) => {
    const message = docSnapshot.data();

    const title = message["title"];
    const body = message["body"] || "";
    const photoUrl = message["photoUrl"] || "";
    const senderId = message["senderId"] || "";
    const receiverId = message["receiverId"];
    const redirectTo = message["redirectTo"] || "";
    const seen = message["seen"] || "0";
    const client = message["client"] || "";
    const messageId = message["messageId"] || "";
    const messageDate = message["date"] || `${new Date().toISOString()}`;
    const id = docSnapshot.id

    try {
      admin
        .firestore()
        .collection('notifications')
        .doc(id)
        .update({
          date: messageDate,    
          isDeleted: false,    
        }).then((value) => (console.log("Date updated successfully!"))).catchError((error) => console.log("Something went wrong, please try again later", error));
    } catch (e) {
      console.log("Something went wrong, please try again later", e);
    }
    
    return admin
      .firestore()
      .doc('users/'+receiverId+'@'+client)
      .get()
      .then((userDoc) => {
        const registrationTokens = userDoc.get("deviceTokens");
        const payload = {
            notification: {
                title: title,
                body: body,
                image: photoUrl,
            },
            data: {
                seen: `${seen}`,
                date: `${new Date().toISOString()}`,
                photoUrl,
                senderId,
                receiverId,
                redirectTo,
                client,
                messageId: `${messageId}`,
                id: id
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
              .doc('users/'+receiverId+'@'+client)
              .update({
                deviceTokens: stillRegisteredTokens,
              });
          });
      });
  });

  // // Register an HTTP function with the Functions Framework
  // exports.insertStatisticsToFirestore = functions.https('insertStatisticsToFirestore', (req, res) => {
  //   const reqData = req.body;
  //   const action = reqData["action"];
  //   const buttonID = reqData["buttonID"];
  //   const date = reqData["date"];
  //   const user = reqData["user"];
  //   const client = reqData["client"];
  //   // Your code here
  //   try {
  //     admin
  //       .firestore()
  //       .collection('statistics')
  //       .add({
  //         'client': client,
  //         'action': action,
  //         'buttonID': buttonID,
  //         'user': user,
  //         'date': date,
  //       })
  //       .then((value) => {
  //         console.log("Record saved to statistics collection.");
  //         return res.send('Record saved to statistics collection.');
  //       })
  //       .catchError((error) => {
  //         console.log('Failed to insert data in statistics collection: $error');
  //         return res.send('Failed to insert data in statistics collection: $error');
  //       });
  //   } catch (e) {
  //     const errorCode = e.code;
  //     const msg = "Something went wrong, please try again later";
  //     return res.send(`${errorCode} ${msg} ${JSON.stringify(e)}`)
  //   }
  // });

  app.post('/insertStatisticsToFirestore', (req, res) => {
    const reqData = req.body;
    const action = reqData["action"];
    const buttonID = reqData["buttonID"];
    const date = reqData["date"];
    const user = reqData["user"];
    const client = reqData["client"];
    try {
      admin
        .firestore()
        .collection('statistics')
        .add({
          'client': client,
          'action': action,
          'buttonID': buttonID,
          'user': user,
          'date': date,
        }).then((value) => 
          res.status(200).send("Received POST request: inserted data in statistics collection!")
          ).catchError((error) => res.status(400).send("Failed to insert data in statistics collection: $error"));
        return res.status(200).send("Received POST request: inserted data in statistics collection!")
    } catch (e) {
      const errorCode = e.code;
      const msg = "Something went wrong, please try again later";
      return res.status(400).send(`${errorCode} ${msg} ${JSON.stringify(e)}`);
    }

  });
  
  // Expose Express API as a single Cloud Function:
  exports.widgets = functions.https.onRequest(app);

