from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


def simple_tags(text: str):
    keywords = []
    for k in ["체육", "해커톤", "프로젝트", "동아리", "수학여행", "공연", "축제", "졸업", "시험", "발표"]:
        if k in text:
            keywords.append(k)
    if not keywords:
        keywords = ["일상", "친구", "기록"]
    return keywords[:5]


@app.post("/api/ai/suggest")
def ai_suggest():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    body = (data.get("body") or "").strip()
    friend_names = data.get("friendNames") or []
    text = f"{title}\n{body}".strip()

    tags = simple_tags(text)
    mentions = [name for name in friend_names if name and (name in text)]
    mentions = mentions[:5]

    return jsonify({"tags": tags, "mentions": mentions})


@app.post("/api/ai/highlight")
def ai_highlight():
    data = request.get_json(silent=True) or {}
    title = data.get("title") or "오늘의 추억"
    likes = int(data.get("likes") or 0)
    comments = int(data.get("comments") or 0)
    date = data.get("date") or ""

    summary = f"오늘 가장 반응이 뜨거웠던 순간: {title} (좋아요 {likes}, 댓글 {comments}) {date}".strip()
    return jsonify({"summary": summary})


# Local dev convenience: python api/ai.py
if __name__ == "__main__":
    app.run(debug=True, port=5000)
