# Validation Summary: How to Set Up a MERN Stack with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman pods and containers
- MongoDB official container image
- Express.js
- Mongoose
- React
- Vite
- Node.js official container images
- Dockerfile/Containerfile multi-stage builds

## Sources Consulted
- Podman `pod create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `run` and volume mount documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- MongoDB official container image documentation: https://hub.docker.com/_/mongo
- MongoDB connection string authentication options: https://www.mongodb.com/docs/manual/reference/connection-string-options/
- Mongoose 8 API documentation: https://mongoosejs.com/docs/8.x/docs/api/mongoose.html
- React Create React App deprecation announcement: https://react.dev/blog/2025/02/14/sunsetting-create-react-app
- React versions documentation: https://react.dev/versions
- Vite server options documentation: https://vite.dev/config/server-options
- Express static files documentation: https://expressjs.com/en/starter/static-files
- Node.js official release schedule: https://github.com/nodejs/Release
- Node.js official Docker image tags: https://hub.docker.com/_/node

## Issues Found
- The frontend used Create React App and `react-scripts`, which React officially deprecated in February 2025. Replaced the frontend setup with Vite, including `vite.config.js`, `index.html`, and `src/main.jsx`, and configured the `/api` proxy, container host binding, port, and polling watcher through Vite.
- The `package.json` snippets included JavaScript comments inside `json` code blocks, which would not be valid `package.json` files. Moved filenames outside the JSON blocks.
- The container examples used `node:20-bookworm-slim`, but Node.js 20 reached end-of-life on April 30, 2026. Updated Node image references to `node:24-bookworm-slim`.
- The API hot-reload bind mount `./api:/app` would hide the image's installed `/app/node_modules` directory. Added a named `/app/node_modules` volume with Podman's `copy` option in both the direct run commands and the management script.
- The production Containerfile copied Vite's old Create React App build path and used `npm ci` even though the tutorial only creates `package.json` files. Updated the frontend artifact path from `/app/build` to `/app/dist` and used `npm install` commands that work without a committed lockfile.

## Review Notes
- Podman was not installed in the local workspace, so CLI behavior was verified against official Podman documentation rather than local `--help` output.
- The MongoDB root user, `authSource=admin`, pod-level port publishing, localhost communication inside a Podman pod, Mongoose connection usage, Express routes, and Express static-serving note were consistent with the consulted official documentation.
