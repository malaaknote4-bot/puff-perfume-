# Trim, downscale (2x supersampled) and save renders from 3d/png/ as WebP in img/
import sys, os, glob
from PIL import Image
out=os.path.join(os.path.dirname(__file__), '..', 'img')
names=sys.argv[1:] or [os.path.basename(f)[:-4] for f in glob.glob(os.path.join(os.path.dirname(__file__),'png','*.png'))]
for n in names:
    im=Image.open(os.path.join(os.path.dirname(__file__),'png',n+'.png')).convert('RGBA')
    if not n.startswith('extra-'):
        a=im.split()[3].point(lambda v:255 if v>6 else 0); l,t,r,b=a.getbbox()
        p=int(im.height*.015); im=im.crop((max(0,l-p),max(0,t-p),min(im.width,r+p),min(im.height,b+p)))
    im=im.resize((im.width//2, im.height//2), Image.LANCZOS)
    im.save(f'{out}/{n}.webp','WEBP',quality=84,method=6)
print('converted',len(names))
