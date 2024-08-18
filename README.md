# WebGL Shader Template

This serves as a boilerplate for creating WebGL-based applications using
[Vite](https://vitejs.dev/) and [TypeScript](https://www.typescriptlang.org/).
You can view the template built and deployed at
[nmattia.com/webgl-starter-template](https://nmattia.com/webgl-starter-template).

Whether you're just getting started with WebGL or looking for a quick way to
bootstrap your shader projects, this template should serve as a solid
foundation. The built site is about 15KB (uncompressed, plus the favicon).

## Getting Started

### Development

First install the dependencies (Vite & TypeScript):

```bash
npm ci
```

To start the development server with hot-reloading:

```bash
npm run dev
```

Your project should now be running at [http://localhost:5173](http://localhost:5173).
Open the URL in your browser to see the template in action. Any changes you
make to the shaders or TypeScript files will automatically reload the page.

### Building for Production

To build the project for production:

```bash
npm run build
```

The production-ready files will be output to the `dist` directory. You can
deploy these files to any static site hosting service.

#### Deploying with GitHub Pages

The [GitHub Actions](https://github.com/features/actions) workflow defined in
`.github/workflows/ci.yml` automates the deployment to
[GitHub Pages](https://pages.github.com/). Make sure you have GitHub Pages
enabled for your repository (Settings -> Pages -> Source -> GitHub Actions)

### Project Structure

```
webgl-shader-template/
├── index.html          # Vite entry point & main page
├── public              # Static assets
└── src
    ├── main.ts         # Main TypeScript file setting up WebGL
    ├── frag.glsl       # Fragment shader (where animation is defined)
    └── vert.glsl       # Vertex shader (setting up the vertices)
```

### Customizing Shaders

Shaders are stored in the `src/` directory and have a `.glsl` extension. This
template includes basic vertex shader setting up 4 vertices that the fragment
shader draws on. Thefragment shader includes an animation that you can remove
or tweak and see how your changes affect what is shown on the screen.

### Prettier

This template comes pre-configured with Prettier for consistent code
formatting. You can run the following commands to format your code:

```bash
npm run format
```

### License

This project is licensed under the [MIT License](LICENSE). You are free to use,
modify, and distribute this template in your own projects.

If you have any questions or need further assistance, feel free to reach out
via the issues tab on GitHub.
