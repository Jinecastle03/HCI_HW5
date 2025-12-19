# ai_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- (선택) 진짜 AI: transformers 사용 ---
USE_TRANSFORMERS = True
try:
    from transformers import pipeline
    # 가벼운 text2text 모델(다운로드 필요). 안 되면 자동으로 시뮬레이션 fallback.
    generator = pipeline("text2text-generation", model="google/flan-t5-base")
except Exception:
    USE_TRANSFORMERS = False
    generator = None

def simple_tags(text: str):
    # ✅ 시뮬레이션(인터넷/모델 다운로드 안 될 때도 동작)
    keywords = []
    for k in ["체육", "해커톤", "프로젝트", "동아리", "수학여행", "공연", "축제", "졸업", "시험", "발표"]:
        if k in text:
            keywords.append(k)
    if not keywords:
        keywords = ["일상", "친구", "기록"]
    return keywords[:5]

@app.route("/ai/suggest", methods=["POST"])
def ai_suggest():
    """
    input:  { "title": "...", "body": "...", "friendNames": ["이지원","홍길동",...] }
    output: { "tags": ["해커톤","프로젝트"], "mentions": ["이지원","홍길동"] }
    """
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    body = (data.get("body") or "").strip()
    friend_names = data.get("friendNames") or []
    text = f"{title}\n{body}".strip()

    # 1) tags
    if USE_TRANSFORMERS and generator and text:
        prompt = (
            "다음 글에서 활동 태그 3~5개를 한국어 단어로만 뽑아라. "
            "쉼표로만 구분해서 출력:\n" + text
        )
        try:
            out = generator(prompt, max_length=64, do_sample=False)[0]["generated_text"]
            tags = [t.strip().lstrip("#") for t in out.split(",") if t.strip()]
        except Exception:
            tags = simple_tags(text)
    else:
        tags = simple_tags(text)

    tags = list(dict.fromkeys([t for t in tags if t]))[:5]  # unique, limit

    # 2) mentions (시뮬레이션 규칙: 본문에 이름이 등장하면 멘션)
    mentions = []
    for name in friend_names:
        if name and (name in text):
            mentions.append(name)
    mentions = mentions[:5]

    return jsonify({"tags": tags, "mentions": mentions})

@app.route("/ai/highlight", methods=["POST"])
def ai_highlight():
    """
    input:  { "title": "...", "likes": 3, "comments": 2, "date": "2025-12-18" }
    output: { "summary": "..." }
    """
    data = request.get_json() or {}
    title = data.get("title") or "오늘의 추억"
    likes = int(data.get("likes") or 0)
    comments = int(data.get("comments") or 0)
    date = data.get("date") or ""

    base = f"{title} (좋아요 {likes}, 댓글 {comments})"
    if USE_TRANSFORMERS and generator:
        prompt = f"다음 정보를 한 문장 한국어로 요약해줘:\n{base}\n날짜:{date}"
        try:
            out = generator(prompt, max_length=64, do_sample=False)[0]["generated_text"]
            summary = out.strip()
        except Exception:
            summary = f"오늘 가장 반응이 뜨거웠던 순간: {base}"
    else:
        summary = f"오늘 가장 반응이 뜨거웠던 순간: {base}"

    return jsonify({"summary": summary})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
