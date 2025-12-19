const path = require("path");
const express = require("express");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
// Vercel serverless functions can only write to /tmp, so switch upload dir accordingly
const ROOT_DIR = process.env.VERCEL ? process.cwd() : __dirname;
const uploadDir = process.env.VERCEL ? path.join("/tmp", "uploads") : path.join(ROOT_DIR, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({ storage });

// ===== Mock data (can be swapped for DB later) =====
const friends = [
  { id: 1, name: "김혜성", role: "VR 동아리 • 3학년", detail: "게임 만들기 좋아하는 겜돌이", tags: ["VR동아리", "3학년", "겜돌이"], photos: 7 },
  { id: 2, name: "홍길동", role: "축구부 • 윙포워드", detail: "운동장 러버, 체력 만렙", tags: ["축구부", "운동광", "파워슛"], photos: 5 },
  { id: 3, name: "이지원", role: "사진부 • 감성러", detail: "빛을 찾아 떠나는 포토그래퍼", tags: ["사진러버", "아트", "필름감성"], photos: 6 },
  { id: 4, name: "최수현", role: "밴드부 • 드러머", detail: "공연 때마다 무대 뒤를 지키는 드러머", tags: ["음악", "밴드", "공연"], photos: 4 },
  { id: 5, name: "민호", role: "공식 사진사", detail: "항상 사진 찍어주는 든든한 사진러버", tags: ["사진러버", "졸업앨범", "카메라"], photos: 8 }
];

const memories = [
  {
    id: 101,
    authorId: 1,
    title: "체육대회 단체샷",
    desc: "땀범벅이지만 모두가 웃고 있던 날",
    tags: ["체육대회", "땀과웃음"],
    likes: 32,
    comments: 9,
    likedBy: [],
    date: "2024.06.12",
    location: "운동장",
    friends: ["김혜성", "홍길동", "민호"],
    body: "6월의 뜨거운 운동장에서 모두가 흠뻑 땀을 흘리며 뛰었던 날. 힘들었지만 사진을 보면 웃음만 나는 추억.",
    commentList: [
      { author: "민호", text: "카메라에 땀방울이 묻었는데 그게 더 감성!", date: "2024.06.13" },
      { author: "지원", text: "같이 물 뿌리며 놀았던 거 아직도 기억나!", date: "2024.06.13" }
    ]
  },
  {
    id: 102,
    authorId: 2,
    title: "봄소풍",
    desc: "바람이 아직 차가웠지만 사진만큼은 따뜻했던 날",
    tags: ["봄소풍", "사진포텐"],
    likes: 21,
    comments: 5,
    likedBy: [],
    date: "2024.03.28",
    location: "한강공원",
    friends: ["이지원", "최수현"],
    body: "돗자리를 깔고 누워서 하늘을 바라보며 찍었던 사진들. 아직 쌀쌀했지만 햇살 덕분에 마음은 따뜻.",
    commentList: [
      { author: "수현", text: "그때 찍은 필름 다 현상해서 공유할게!", date: "2024.03.29" }
    ]
  },
  {
    id: 103,
    authorId: 3,
    title: "한강 피크닉",
    desc: "끝나지 않을 것 같던 팀플 뒤 힐링 피크닉",
    tags: ["힐링", "한강", "피크닉"],
    likes: 18,
    comments: 3,
    likedBy: [],
    date: "2024.10.05",
    location: "여의도 한강공원",
    friends: ["김혜성", "민호", "최수현"],
    body: "팀플 마감 직후 바로 달려간 한강. 해 질 무렵 강바람 맞으며 컵라면을 먹던 순간이 최고.",
    commentList: [
      { author: "혜성", text: "컵라면+석양=인생조합", date: "2024.10.05" }
    ]
  }
];

let activityLog = [
  { id: 1, type: "upload", message: "체육대회 단체샷 업로드", date: "2024-06-12T10:00:00Z" },
  { id: 2, type: "comment", message: "수현님이 봄소풍에 댓글을 남겼습니다", date: "2024-03-29T09:00:00Z" }
];

const users = [
  { id: 1, username: "hci", password: "1234", created: [101], tagged: [101, 103] },
  { id: 2, username: "guest", password: "1234", created: [102], tagged: [102] }
];

// ===== Middleware =====
app.use(express.json());
// Serve static from repo root (works both locally and in Vercel bundle)
app.use(express.static(ROOT_DIR));
app.use("/uploads", express.static(uploadDir));

// Root serve main.html explicitly (and alias /index.html)
app.get(["/", "/index.html", "/main", "/main.html"], (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "main.html"));
});

// Serve other html files directly (gallery, login, etc.)
app.get("/:page.html", (req, res, next) => {
  const filePath = path.join(ROOT_DIR, `${req.params.page}.html`);
  fs.access(filePath, fs.constants.F_OK, err => {
    if (err) return next();
    res.sendFile(filePath);
  });
});

// ===== API endpoints =====
app.get("/api/friends", (_req, res) => {
  res.json(friends);
});

app.get("/api/memories", (_req, res) => {
  res.json(memories);
});

app.get("/api/highlights", (_req, res) => {
  // simple derivation of highlights; front uses likes/comments to pick popular
  res.json(memories.map(({ id, title, desc, tags, likes, comments }) => ({
    id, title, desc, tags, likes, comments
  })));
});

app.get("/api/memories/:id", (req, res) => {
  const id = Number(req.params.id);
  const mem = memories.find(m => m.id === id);
  if (!mem) {
    return res.status(404).json({ message: "Memory not found" });
  }
  res.json(mem);
});

app.get("/api/activity", (_req, res) => {
  const recent = [...activityLog].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  res.json(recent);
});

// Auth (simple in-memory)
app.post("/api/auth/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "필수값 누락" });
  if (users.find(u => u.username === username)) return res.status(409).json({ message: "이미 존재하는 아이디" });

  const newUser = { id: Date.now(), username, password, created: [], tagged: [] };
  users.push(newUser);

  // ✅ 친구 목록에도 반영 (friends 배열이 server.js에 이미 존재한다는 전제)
  // 이미 있다면 중복 방지
  if (!friends.find(f => f.name === username)) {
    friends.push({
      id: newUser.id,
      name: username,
      role: "새 친구",
      detail: "새로 가입한 친구",
      tags: [],
      photos: 0
    });
  }

  res.json({ id: newUser.id, username: newUser.username });
});


app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: "아이디/비밀번호 확인" });
  res.json({ id: user.id, username: user.username });
});

app.get("/api/me", (req, res) => {
  const userId = Number(req.header("x-user-id"));
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(401).json({ message: "로그인 필요" });
  const createdMemories = memories.filter(m => m.authorId === user.id);
  const taggedMemories = memories.filter(m => (m.tags || []).some(t => t.includes(user.username)));
  res.json({
    id: user.id,
    username: user.username,
    createdCount: createdMemories.length,
    taggedCount: taggedMemories.length,
    createdMemories,
    taggedMemories
  });
});

// Create memory (multipart for photo)
app.post("/api/memories", upload.single("photo"), (req, res) => {
  const {
    title = "새 추억",
    desc = "",
    body = "",
    tags = "",
    date = "",
    location = "",
    friends: friendsField = "",
  } = req.body;

  const newId = Date.now();
  const tagList = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  const friendList = friendsField ? friendsField.split(",").map(f => f.trim()).filter(Boolean) : [];

  if (!req.header("x-user-id")) {
    return res.status(401).json({ message: "로그인 필요" });
  }

  if (!title || !body || !date) {
    return res.status(400).json({ message: "필수 입력 누락" });
  }

  const newMemory = {
    id: newId,
    authorId: Number(req.header("x-user-id")) || null,
    title,
    desc: desc || body,
    body: body || desc,
    tags: tagList,
    date,
    location,
    friends: friendList,
    likes: 0,
    comments: 0,
    commentList: [],
    imageUrl: req.file ? `/uploads/${req.file.filename}` : null
  };
  memories.push(newMemory);
  const author = users.find(u => u.id === newMemory.authorId);
  if (author) author.created.push(newId);
  activityLog.push({ id: Date.now(), type: "upload", message: `${title} 업로드`, date: new Date().toISOString() });
  res.status(201).json(newMemory);
});

// Update memory
app.put("/api/memories/:id", upload.single("photo"), (req, res) => {
  const id = Number(req.params.id);
  const idx = memories.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ message: "Memory not found" });

  const {
    title,
    desc,
    body,
    tags,
    date,
    location,
    friends: friendsField,
    likes,
    comments
  } = req.body;

  if (title) memories[idx].title = title;
  if (desc) memories[idx].desc = desc;
  if (body) memories[idx].body = body;
  if (tags) memories[idx].tags = tags.split(",").map(t => t.trim()).filter(Boolean);
  if (date) memories[idx].date = date;
  if (location) memories[idx].location = location;
  if (friendsField) memories[idx].friends = friendsField.split(",").map(f => f.trim()).filter(Boolean);
  if (likes) memories[idx].likes = Number(likes);
  if (comments) memories[idx].comments = Number(comments);
  if (req.file) memories[idx].imageUrl = `/uploads/${req.file.filename}`;

  res.json(memories[idx]);
});

// Delete memory
app.delete("/api/memories/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = memories.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ message: "Memory not found" });
  memories.splice(idx, 1);
  res.json({ success: true });
});

// Add comment
app.post("/api/memories/:id/comments", (req, res) => {
  const id = Number(req.params.id);
  const mem = memories.find(m => m.id === id);
  if (!mem) return res.status(404).json({ message: "Memory not found" });
  const { text = "" } = req.body;
  const userId = Number(req.header("x-user-id"));
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(401).json({ message: "로그인 필요" });
  const authorName = user.username;
  const comment = {
    author: authorName,
    text,
    date: new Date().toISOString().slice(0, 10)
  };
  mem.commentList = mem.commentList || [];
  mem.commentList.push(comment);
  mem.comments = mem.commentList.length;
  activityLog.push({ id: Date.now(), type: "comment", message: `${authorName}님이 ${mem.title}에 댓글을 남겼습니다`, date: new Date().toISOString() });
  res.status(201).json(comment);
});

app.post("/api/memories/:id/like", (req, res) => {
  const id = Number(req.params.id);
  const mem = memories.find(m => m.id === id);
  if (!mem) return res.status(404).json({ message: "Memory not found" });

  const userId = Number(req.header("x-user-id"));
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(401).json({ message: "로그인 필요" });

  mem.likedBy = Array.isArray(mem.likedBy) ? mem.likedBy : [];

  const already = mem.likedBy.includes(userId);

  if (already) {
    // unlike
    mem.likedBy = mem.likedBy.filter(uid => uid !== userId);
    mem.likes = Math.max(0, Number(mem.likes || 0) - 1);
  } else {
    // like
    mem.likedBy.push(userId);
    mem.likes = Number(mem.likes || 0) + 1;
  }

  activityLog.push({
    id: Date.now(),
    type: already ? "unlike" : "like",
    message: `${user.username}님이 ${mem.title}에 ${already ? "좋아요 취소" : "좋아요"}를 눌렀습니다`,
    date: new Date().toISOString()
  });

  res.json({ likes: mem.likes, liked: !already });
});


// Export app for Vercel serverless; still allow local dev server
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, HOST, () => {
    console.log(`Yearbook server running at http://${HOST}:${PORT}`);
  });
}
