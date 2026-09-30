from PIL import Image, ImageChops
import os
for f in sorted(os.listdir('before')):
    a=Image.open('before/'+f).convert('L'); b=Image.open('after/'+f).convert('L')
    h=min(a.height,b.height)
    d=ImageChops.difference(a.crop((0,0,a.width,h)),b.crop((0,0,b.width,h))).point(lambda x:255 if x>24 else 0)
    print(f"{f:26s} {100*sum(1 for v in d.get_flattened_data() if v)/(a.width*h):5.1f}%  h {a.height}->{b.height}")
