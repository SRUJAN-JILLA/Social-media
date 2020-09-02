const functions = require("firebase-functions");
const admin = require("firebase-admin");
const app = require("express")();
admin.initializeApp();

const firebaseConfig = {
  apiKey: "AIzaSyDAWkr2Ixaa-6wKb6WYcgkvnNcCoBtoumw",
  authDomain: "social-media-b5c52.firebaseapp.com",
  databaseURL: "https://social-media-b5c52.firebaseio.com",
  projectId: "social-media-b5c52",
  storageBucket: "social-media-b5c52.appspot.com",
  messagingSenderId: "960864212038",
  appId: "1:960864212038:web:0b1f7cfdb404f16c75e647",
  measurementId: "G-K8DYJG6NQG",
};

const firebase = require("firebase");
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true })

app.get("/screams", (req, res) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let screams = [];
      data.forEach((doc) => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createAt: doc.data().createdAt,
        });
      });
      return res.json(screams);
    })
    .catch((err) => console.error(err));
});

//all the posts gets authentication cause wat ever we check and see has to autorized
const FBAuth = (req,res,next) =>{
  let idToken;
  if(req.headers.authorization && req.headers.authorization.startsWith("Bearer ")){
    idToken = req.headers.authorization.split("Bearer ")[1];
} else {
  console.error("No token found");
  return res.status(403).json({error: "Unauthorized"});
}

admin.auth().verifyIdToken(idToken)
.then(decodedToken => {
  req.user = decodedToken;
  console.log(decodedToken);
  return db.collection("users")
  .where("userId","==",req.user.uid)
  .limit(1)
  .get();
})
.then(data =>{
  req.user.handle = data.docs[0].data().handle;
  return next();
})
.catch(err =>{
  console.error("Error while verifying token",err);
  return res.status(403).json(err);
})
}

//by the time you get to this code you will already been verified
//adding our own data
app.post("/scream", FBAuth, (req, res) => {
  //getting the new data
  const newScream = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
  };
  // adding the data to database
  db.collection("screams")
    .add(newScream)
    .then((doc) => {
      res.json({ message: "created successfully" });
    })
    .catch((err) => {
      res.status(500).json({ error: "something went wrong" });
      console.log(err);
    });
});

const isEmpty = (string) => {
  if (string.trim() == "") return true;
  else return false;
};

const isEmail = (email) => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};
//signup route
app.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  //TODO: validate data
  let errors = {};

  if (isEmpty(newUser.email)) {
    errors.email = "Must not be empty.";
  } else if (!isEmail(newUser.email)) {
    errors.email = "Must be a valid email address.";
  }

  if (isEmpty(newUser.password)) errors.password = "Must not be empty";
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = "Password must match.";
  if (isEmpty(newUser.handle)) errors.handle = "Must not be empty";

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  let token;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res
          .status(400)
          .json({ handle: "This handle is already takken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId: userId,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    }) //unique member
    .catch((err) => {
      console.error(err);
      if (err.code == "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
});

app.post("/login", (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  let errors = {};
  if (isEmpty(user.email)) errors.email = "Must not be empty";
  if (isEmpty(user.password)) errors.password = "Must not be empty";

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "Wrong credentials, please try again" });
      }else return res.status(500).json({ error: err.code });
    });
});

exports.api = functions.https.onRequest(app);