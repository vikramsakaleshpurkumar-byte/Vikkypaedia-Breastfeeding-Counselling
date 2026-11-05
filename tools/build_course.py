"""Build the static course into ./dist (opens offline from index.html, no server needed).

Usage: .venv\\Scripts\\python.exe build_course.py "<path to 45-points PDF>"
"""
import json, os, shutil, sys
import course_data as D

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
DIST = os.path.join(ROOT, "dist")
IMGS = os.path.join(ROOT, "build_assets", "img")

# ---- image -> point mapping
pt_imgs = {n: [] for n in D.P}
for page, pts in D.IMG_MAP.items():
    for k, n in enumerate(pts, 1):
        f = f"{page}_{k}"
        pt_imgs[n].append({"f": f, "alt": D.IMG_ALT[f]})

SPOT = [
 dict(img="p14_1", alt=D.IMG_ALT["p14_1"], q="Observe the baby's nose against the breast. What should the mother do?",
      o=["Gently extend the baby's neck so the chin presses into the breast and the forehead moves away", "Press the breast away from the nose with her finger", "Flex the baby's neck forward", "Stop the feed"], a=0,
      why="The nose is pressed in tightly. Extending the neck brings the chin in and the forehead away so the nose is free.", ref="P39"),
 dict(img="p14_4", alt=D.IMG_ALT["p14_4"], q="You see a dimple in the baby's cheek during the feed. What is your interpretation?",
      o=["Normal sucking; no action", "Nipple-only feeding: check lips/chin embedding and upper vs lower areola, then reposition", "The baby is full", "The breast is empty"], a=1,
      why="Dimples indicate feeding from the nipple only, with more upper than lower areola in the mouth or lips and chin not embedded.", ref="P41"),
 dict(img="p09_3", alt=D.IMG_ALT["p09_3"], q="The baby's mouth is only partly open and the mother is about to push the nipple in. What should she do?",
      o=["Push the nipple in quickly", "Keep brushing the upper lip and wait for a 120-160 degree opening", "Close the baby's mouth and try later", "Give the baby the other breast"], a=1,
      why="Hurrying with a partly open mouth gives nipple-only attachment and too little milk. Waiting can take 2-3 minutes.", ref="P26"),
 dict(img="p08_6", alt=D.IMG_ALT["p08_6"], q="What is wrong with the way the breast is held?",
      o=["Nothing", "It is a V-shape hold: the baby attaches only to the nipple and gets little milk; use a U-hold with even compression", "The hand is too far from the baby", "The hand is on the wrong side"], a=1,
      why="V-shape hold leads to nipple-only attachment.", ref="P24"),
 dict(img="p03_5", alt=D.IMG_ALT["p03_5"], q="What is the issue with how this baby is dressed for breastfeeding?",
      o=["Too little clothing", "Very thick cloth and cap can become a barrier between mother and baby; use warm but not thick clothing", "The cap is the wrong colour", "No issue"], a=1,
      why="Warm clothing is fine in winter; very thick cloth interferes with the close contact needed for feeding.", ref="P7"),
 dict(img="p14_3", alt=D.IMG_ALT["p14_3"], q="The cheeks look round and full. What does this tell you?",
      o=["The baby is gulping air", "Correct breastfeeding: no dimple, no fast swallowing sounds, slow jaw drops", "The baby is not hungry", "The latch is shallow"], a=1,
      why="Round, full cheeks without dimples are a sign of correct breastfeeding.", ref="P40"),
]

course = {
  "points": {str(n): {"text": D.P[n], "imgs": pt_imgs[n]} for n in D.P},
  "modules": D.MODULES,
  "obs": D.OBS, "assess": D.ASSESS, "seq": D.SEQ,
  "cards": [list(c) for c in D.CARDS],
  "preIds": D.PRE_IDS, "spot": SPOT,
}
# strip unused keys
for m in course["modules"]:
    for st in m["case"]["stages"]:
        st.pop("why", None)

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

# cover (cropped from page 1, no text)
if len(sys.argv) > 1:
    import pymupdf
    from PIL import Image
    d = pymupdf.open(sys.argv[1])
    pix = d[0].get_pixmap(dpi=110)
    im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    w, h = im.size
    im.crop((int(.12*w), int(.47*h), int(.88*w), int(.93*h))).save(os.path.join(DIST, "img", "cover.jpg"), quality=88)

# Anki export
with open(os.path.join(DIST, "anki_flashcards.tsv"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(f"{q}\t{a}" for q, a in D.CARDS))

n_mcq = sum(len(m["mcq"]) for m in D.MODULES)
print(f"points={len(D.P)} modules={len(D.MODULES)} mcq={n_mcq} cards={len(D.CARDS)} cases={len(D.MODULES)} spot={len(SPOT)} images={len(os.listdir(os.path.join(DIST,'img')))}")
