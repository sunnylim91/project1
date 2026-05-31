"""
convert_xlsx.py
엑셀(문제만.xlsx) → public/db/questions.json 변환 스크립트

컬럼 구조:
  A = 연도 (year)
  B = 회차 (round)
  C = 문제 (question)
"""

import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

import pandas as pd

# ── 경로 설정 ──────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
XLSX_PATH   = PROJECT_DIR.parent / "문제만.xlsx"   # 상위 디렉토리의 원본 파일
OUT_PUBLIC  = PROJECT_DIR / "public" / "db" / "questions.json"
OUT_SRC     = PROJECT_DIR / "src" / "data" / "questions.json"

# ── 문제 유형 분류 ─────────────────────────────────────────────
TYPE_RULES = [
    ("비교형", ["비교", "차이", "구분", "대비"]),
    ("논술형", ["논하", "방안", "대책", "문제점", "개선"]),
    ("설명형", ["설명", "서술", "기술하", "제작 과정", "방법에 대하여"]),
]

def classify_type(question: str) -> str:
    for qtype, patterns in TYPE_RULES:
        if any(p in question for p in patterns):
            return qtype
    return "용어형"

# ── 키워드 추출 ────────────────────────────────────────────────
ABBR_RE = re.compile(r"[(\[（]([A-Z][A-Z0-9\-]{1,9})[)\]）]")
JOSA_RE = re.compile(
    r"([가-힣a-zA-Z\s]+?)(?:을|를|이|가|의|에서|에|은|는|과|와|로|으로|도|만|까지|부터|에게|께|한테)(?:\s|$)"
)

def extract_keywords(question: str, max_kw: int = 5) -> list[str]:
    keywords: list[str] = []

    # 1) 영문 약어 우선
    for m in ABBR_RE.finditer(question):
        kw = m.group(1)
        if kw not in keywords:
            keywords.append(kw)
        if len(keywords) >= max_kw:
            return keywords

    # 2) 조사 기준 명사구
    for m in JOSA_RE.finditer(question):
        noun = m.group(1).strip().strip(".,·")
        if len(noun) >= 2 and noun not in keywords:
            keywords.append(noun)
        if len(keywords) >= max_kw:
            break

    return keywords[:max_kw]

# ── 유사 문제 빈도 집계 (간단한 키워드 해시 기반) ────────────────
def compute_frequency(questions: list[dict]) -> list[dict]:
    keyword_counter: Counter = Counter()
    for q in questions:
        key = frozenset(q["keywords"])
        keyword_counter[key] += 1

    for q in questions:
        key = frozenset(q["keywords"])
        q["frequency"] = keyword_counter[key]
    return questions

# ── 메인 변환 로직 ─────────────────────────────────────────────
def convert(xlsx_path: Path) -> list[dict]:
    df = pd.read_excel(xlsx_path, header=None, usecols=[0, 1, 2])
    df.columns = ["year", "round", "question"]

    # 빈 행 제거 및 타입 정규화
    df = df.dropna(subset=["question"])
    df["year"]  = pd.to_numeric(df["year"],  errors="coerce").astype("Int64")
    df["round"] = pd.to_numeric(df["round"], errors="coerce").astype("Int64")
    df = df.dropna(subset=["year", "round"])
    df["question"] = df["question"].astype(str).str.strip()
    df = df[df["question"] != ""]

    questions = []
    seq_counter: dict[tuple, int] = {}

    for _, row in df.iterrows():
        year  = int(row["year"])
        round_ = int(row["round"])
        q_text = row["question"]

        key = (year, round_)
        seq_counter[key] = seq_counter.get(key, 0) + 1
        seq = seq_counter[key]

        qid = f"{year}-{round_}-{seq:03d}"

        questions.append({
            "id":       qid,
            "year":     year,
            "round":    round_,
            "question": q_text,
            "type":     classify_type(q_text),
            "keywords": extract_keywords(q_text),
            "frequency": 1,
        })

    questions = compute_frequency(questions)
    return questions

# ── 저장 ──────────────────────────────────────────────────────
def save_json(questions: list[dict], out_path: Path) -> None:
    years = sorted(set(q["year"] for q in questions))
    payload = {
        "meta": {
            "total":     len(questions),
            "years":     years,
            "generated": date.today().isoformat(),
        },
        "questions": questions,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"  저장: {out_path}")

# ── 통계 출력 ─────────────────────────────────────────────────
def print_stats(questions: list[dict]) -> None:
    years = sorted(set(q["year"] for q in questions))
    type_counts: Counter = Counter(q["type"] for q in questions)

    print("\n" + "=" * 50)
    print(f"  총 문제 수   : {len(questions):,} 문제")
    print(f"  연도 범위    : {years[0]} ~ {years[-1]} ({len(years)}개 연도)")
    print(f"  회차 수      : {len(set(q['round'] for q in questions))}개")
    print("\n  [유형별 분포]")
    for qtype in ["비교형", "논술형", "설명형", "용어형"]:
        cnt = type_counts.get(qtype, 0)
        pct = cnt / len(questions) * 100 if questions else 0
        bar = "#" * int(pct / 2)
        print(f"    {qtype:6s} : {cnt:4d}문제  ({pct:5.1f}%)  {bar}")
    print("=" * 50 + "\n")

# ── 엔트리포인트 ───────────────────────────────────────────────
def main():
    if not XLSX_PATH.exists():
        # 인수로 경로를 직접 받을 수도 있음
        if len(sys.argv) > 1:
            xlsx = Path(sys.argv[1])
        else:
            print(f"[오류] 파일을 찾을 수 없습니다: {XLSX_PATH}")
            print("사용법: python scripts/convert_xlsx.py [엑셀파일경로]")
            sys.exit(1)
    else:
        xlsx = XLSX_PATH

    print(f"\n변환 중: {xlsx}")
    questions = convert(xlsx)

    save_json(questions, OUT_PUBLIC)
    save_json(questions, OUT_SRC)

    print_stats(questions)
    print("변환 완료!")

if __name__ == "__main__":
    main()
