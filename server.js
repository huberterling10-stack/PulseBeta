import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let posts = [];

app.get("/posts", (req, res) => {
  res.json(posts);
});

app.post("/posts", (req, res) => {
  const post = { id: Date.now(), text: req.body.text };
  posts.push(post);
  res.json(post);
});

app.listen(3000, () => console.log("PulseBeta backend działa na porcie 3000"));
