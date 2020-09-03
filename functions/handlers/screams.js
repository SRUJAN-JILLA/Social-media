const {db} = require("../util/admin");

exports.getAllScreams =  (req, res) => {
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
  }

  exports.postOneScream = (req, res) => {
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
  }