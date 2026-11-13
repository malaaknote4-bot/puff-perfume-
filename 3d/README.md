# puff 3D product renders

Product images in `../img/` are real 3D renders, not photos or drawings.

- `colors.js`: color tables shared by the site and the models
- `models.js`: Three.js models (lathed bodies, lids, straws, handles, logo decals) and the studio lighting
- `viewer.js`: the live "View in 3D" viewer on the site
- `render.html`: the studio renderer page used to produce the images

To re-render after changing a model or adding a color:

```
cd puff/3d
npm i three@0.160.0 playwright
node render-all.js            # or: node render-all.js sip-plum hero-lineup
python3 convert.py            # writes ../img/*.webp
```
