# Validation Summary: How to Deploy a Node.js + MongoDB Stack via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Official Images (`mongo`, `node`)
- Node.js
- npm
- Express
- Mongoose
- MongoDB
- OneUptime

## Sources Consulted
- Docker Compose reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose startup order and health checks: https://docs.docker.com/compose/how-tos/startup-order/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer relative path volumes docs: https://docs.portainer.io/advanced/relative-paths
- Mongo Docker Official Image docs: https://hub.docker.com/_/mongo?tab=description
- MongoDB authentication with `mongosh`: https://www.mongodb.com/docs/v8.0/tutorial/authenticate-a-user/
- Mongoose connections guide: https://mongoosejs.com/docs/connections.html
- Mongoose API for `connect()`: https://mongoosejs.com/docs/api/mongoose.html
- Mongoose API for `readyState`: https://mongoosejs.com/docs/api/connection.html
- npm `ci` docs: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- npm config docs for `only` / `production`: https://docs.npmjs.com/cli/v10/using-npm/config/

## Issues Found
- The Compose file used the top-level `version` field, which Docker now documents as obsolete and only informative. I removed it to match the current Compose specification.
- The MongoDB health check called `mongosh` without authentication even though `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` enable auth. I changed the health check to pass the root credentials and `--authenticationDatabase admin`, which is how the official image creates the root user.
- `MONGO_INITDB_DATABASE` was present even though this stack does not use `/docker-entrypoint-initdb.d` scripts. I removed it because the official `mongo` image documents that this variable is only for init scripts and does not create the application database by itself.
- The API service used `./api:/app`, which is not a general Portainer stack example unless relative-path volumes are enabled for a Git-based deployment in Portainer Business Edition. I replaced it with an absolute host-path example and clarified what must exist there.
- The container command used `npm ci --only=production`. I changed it because `npm ci` requires an existing lockfile, which the post does not provide, and npm documents `only=production` as deprecated in favor of `--omit=dev`.
- The retry comment said the app retries every 5 seconds, but Mongoose documents a default `serverSelectionTimeoutMS` of 30000 ms for initial connection attempts. I added `serverSelectionTimeoutMS: 5000` so the code matches the stated retry behavior.
- The monitoring section claimed the endpoint returns exactly `{"status":"healthy"}`, but the code returns a JSON object containing both `status` and `db`. I corrected the text to say the response body includes `"status":"healthy"`.

## Review Notes
- The corrected post is technically sound as a small Portainer deployment guide.
- For a more production-oriented setup, building a dedicated application image would be more reproducible than installing dependencies on container startup, but the revised example is valid as written.
