const functions = require('firebase-functions');
const admin = require('firebase-admin');
 
admin.initializeApp(functions.config().functions);
 
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
    const id = docSnapshot.id

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
                messageId,
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
              .doc("users/" + receiverId)
              .update({
                deviceTokens: stillRegisteredTokens,
              });
          });
      });
  });

