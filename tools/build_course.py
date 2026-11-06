"""Build the static course into ./dist (opens offline from index.html, no server needed).

Usage: .venv\\Scripts\\python.exe build_course.py
Inputs: course_data.py (source-linked content), course_data_review.py (option notes, spotter set),
        build_assets/img (illustrations cropped by scripts/crop_illustrations.py; clean spotter crops; forms; hero).
"""
import json, os, shutil
import course_data as D
import course_data_review as R

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
DIST = os.path.join(ROOT, "dist")
IMGS = os.path.join(ROOT, "build_assets", "img")

# ---- image -> point mapping
pt_imgs = {n: [] for n in D.P}
for page, pts in D.IMG_MAP.items():
    for k, n in enumerate(pts, 1):
        f = f"{page}_{k}"
        assert os.path.exists(os.path.join(IMGS, f + ".jpg")), f
        pt_imgs[n].append({"f": f, "alt": D.IMG_ALT[f]})
missing = [n for n in D.P if not pt_imgs[n]]

# ---- option-specific notes, validated
for m in D.MODULES:
    for i, q in enumerate(m["mcq"]):
        n = R.NOTES[f"{m['id']}:{i}"]
        assert len(q["o"]) == 4 and len(set(q["o"])) == 4, (m["id"], i)
        assert 0 <= q["a"] < 4
        assert len(n) == 4 and n[q["a"]] == "" and all(n[j] for j in range(4) if j != q["a"]), (m["id"], i)
        q["n"] = n
    for st in m["case"]["stages"]:
        st.pop("why", None)
        assert len(st["o"]) == len(st["f"]), (m["id"], "case")

# ---- every point must be taught in a unit
taught = {n for m in D.MODULES for u in m["units"] for n in u["pts"]}
assert taught == set(D.P), set(D.P) - taught

for sp in R.SPOT:
    assert os.path.exists(os.path.join(IMGS, sp["img"] + "_clean.jpg")), sp["img"]

course = {
  "points": {str(n): {"text": D.P[n], "imgs": pt_imgs[n]} for n in D.P},
  "modules": D.MODULES,
  "obs": D.OBS, "assess": D.ASSESS, "seq": D.SEQ,
  "cards": [list(c) for c in D.CARDS],
  "preIds": D.PRE_IDS, "spot": R.SPOT,
}

if os.path.isdir(DIST):
    shutil.rmtree(DIST)
os.makedirs(os.path.join(DIST, "img"))
for f in os.listdir(IMGS):
    if f.endswith(".jpg"):
        shutil.copy(os.path.join(IMGS, f), os.path.join(DIST, "img", f))
for f in ("index.html", "style.css", "app.js"):
    shutil.copy(os.path.join(SRC, f), os.path.join(DIST, f))
with open(os.path.join(DIST, "data.js"), "w", encoding="utf-8") as fh:
    fh.write("window.COURSE=" + json.dumps(course, ensure_ascii=False) + ";")

with open(os.path.join(DIST, "anki_flashcards.tsv"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(f"{q}\t{a}\tbreastfeeding" for q, a in D.CARDS))

n_mcq = sum(len(m["mcq"]) for m in D.MODULES)
print(f"points={len(D.P)} taught={len(taught)} pts_without_img={missing} modules={len(D.MODULES)} "
      f"mcq={n_mcq} notes={len(R.NOTES)} cards={len(D.CARDS)} cases={len(D.MODULES)} spot={len(R.SPOT)} "
      f"images={len(os.listdir(os.path.join(DIST,'img')))}")
