# Validation Summary: How to Deploy a MEAN Stack via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Portainer (Docker container management)
- Docker Compose
- MongoDB 7
- Node.js 20 (Alpine)
- Express.js
- Mongoose (ODM)
- Angular (Angular CLI)
- Nginx (Alpine, used as static file server)

## Sources Consulted
- Mongoose connection guide: https://mongoosejs.com/docs/connections.html
- Mongoose 6 migration guide (deprecation of `useNewUrlParser`/`useUnifiedTopology`): https://mongoosejs.com/docs/migrating_to_6.html
- MongoDB Docker official image: https://hub.docker.com/_/mongo
- MongoDB connection string format / `authSource`: https://www.mongodb.com/docs/manual/reference/connection-string/
- Node.js Docker official image: https://hub.docker.com/_/node
- Nginx Docker official image: https://hub.docker.com/_/nginx
- Angular CLI build documentation: https://angular.dev/cli/build
- Docker Compose specification: https://docs.docker.com/compose/compose-file/
- Express.js documentation: https://expressjs.com/

## Issues Found
- **Deprecated Mongoose connection options**: The original code passed `useNewUrlParser: true` and `useUnifiedTopology: true` to `mongoose.connect()`. These options have been deprecated since Mongoose 6 (Aug 2021), are no longer needed, and are ignored in Mongoose 8+. They would produce deprecation warnings in current versions. Fixed by removing the options object so `mongoose.connect(process.env.MONGODB_URI)` is called with just the URI, which is the current recommended usage.

## Review Notes
- The Compose file declares `version: "3.8"`. The `version` top-level element is considered obsolete by the Docker Compose Specification and is ignored by current Compose, but it does not cause errors — files still work. Left as-is since it does not break functionality.
- `ng build --configuration production` is correct. Note that since Angular CLI 12, `ng build` defaults to the production configuration, so `--configuration production` is technically redundant but explicit and harmless.
- The Angular output path comment (`dist/your-app/`) matches Angular ≤16 conventions. In Angular 17+ with the application builder, output is typically under `dist/your-app/browser/`. The post's wording (`dist/your-app/`) is general enough that readers will adapt; not changed.
- The MongoDB connection string uses `authSource=admin`, which is correct when authenticating as the root user created via `MONGO_INITDB_ROOT_USERNAME`/`MONGO_INITDB_ROOT_PASSWORD`.
- The api service runs `npm install && node server.js` at runtime against a bind-mounted `./api` directory. This is acceptable for a tutorial but not ideal for production — building a proper image with a Dockerfile would be more robust. Left as-is since the post is intentionally introductory.
