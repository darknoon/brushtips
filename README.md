This is an experiment with brush drawing in WebGL, with code written in typescript. I am curious what features are needed for a good drawing experince.

View live: http://brush.tips

Features:

- Accepts input at > screen refresh
- Catmull-rom interpolation
- Input distance filtering
- Output distance filtering (only draw if moved x pixels)
- Variable sharpness
- Draw whole stroke or incrementally

Missing features:

- Variable brush diameter with velocity
- Other brush dynamics
- Smoothing of input points during a stroke
- Last stroke segment dynamically (see Notes.app on iOS)
- Dithering
- Texture

Feel free to adapt this for your own use. It may be published on NPM at some point to make that more convenient.

Original experiments
https://codepen.io/darknoon/pen/QMNxQq)
https://codepen.io/darknoon/pen/GvowNQ

The original code was written in 2017 in React. To apply to the [Recurse Center](https://recurse.com), I needed code written without a framework, so I converted this to plain typescript.

How to run locally:

```sh
$ tsc -w
# In another terminal
$ now dev
# or your favorite static site server
```

How to deploy:

```sh
$ now
```
