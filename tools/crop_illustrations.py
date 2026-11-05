"""Crop each framed illustration from the 45-points PDF (pages are full-page rasters).
Boxes are found as non-white runs inside the white right-hand column."""
import pymupdf as fitz, numpy as np, json, os, sys
from PIL import Image
SRC=sys.argv[1]; OUT=sys.argv[2]
os.makedirs(OUT,exist_ok=True)
d=fitz.open(SRC)
expected=[6,5,4,5,4,6,6,3,4,4,5,4,4,4,3]
res={}
for pi in range(1,16):
    pix=d[pi].get_pixmap(dpi=150)
    im=Image.frombytes("RGB",(pix.width,pix.height),pix.samples)
    a=np.asarray(im).astype(int)
    W=pix.width
    x0,x1=int(.66*W),int(.94*W)
    band=a[:,x0:x1]
    white=(band.min(2)>=240)
    rowwhite=white.mean(1)
    nonw=rowwhite<.985
    runs=[];start=None
    for y,v in enumerate(nonw):
        if v and start is None: start=y
        if not v and start is not None:
            runs.append([start,y-1]);start=None
    if start is not None: runs.append([start,len(nonw)-1])
    # merge runs separated by tiny gaps (<8px), drop tiny runs
    m=[]
    for r in runs:
        if m and r[0]-m[-1][1]<8: m[-1][1]=r[1]
        else: m.append(r)
    boxes=[r for r in m if r[1]-r[0]>60 and r[0]>20 and (r[1]<a.shape[0]-60 or pi==14)]
    if pi==15: boxes=boxes[:3]
    print(pi+1,len(boxes),expected[pi-1],flush=True)
    names=[]
    for k,(ya,yb) in enumerate(boxes):
        colsw=(~white[ya:yb+1]).mean(0)
        cols=np.where(colsw>.5)[0]
        xa,xb=cols[0]+x0,cols[-1]+x0
        fn=f"p{pi+1:02d}_{k+1}.jpg"
        im.crop((max(xa-2,0),ya-2,xb+3,yb+3)).save(os.path.join(OUT,fn),quality=88)
        names.append(fn)
    res[pi+1]=names
json.dump(res,open(os.path.join(OUT,"index.json"),"w"))

