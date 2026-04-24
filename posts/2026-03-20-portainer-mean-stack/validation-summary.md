# Validation Summary: How to Deploy a MEAN Stack via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Engine
- MongoDB
- MongoDB Shell (`mongosh`)
- mongo-express
- Node.js
- Express
- Mongoose
- Angular
- nginx
- npm

## Sources Consulted
- Portainer Docs, "Add a new stack": https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs, "How Relative Path Support works in Portainer": https://docs.portainer.io/advanced/relative-paths
- Docker Docs, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, "Control startup and shutdown order in Compose": https://docs.docker.com/compose/how-tos/startup-order/
- Docker Official Image docs for MongoDB: https://hub.docker.com/_/mongo/
- MongoDB Docs, `mongosh` options: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- Angular Docs, "Building Angular apps": https://angular.dev/tools/cli/build
- Angular Docs, "Workspace configuration": https://angular.dev/reference/configs/workspace-config
- Angular Docs, `ng serve`: https://angular.dev/cli/serve
- npm Docs, `npm ci`: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- mongo-express Docker image README: https://github.com/mongo-express/mongo-express-docker
- mongo-express default configuration: https://github.com/mongo-express/mongo-express/blob/master/config.default.js
- Mongoose connection API docs: https://mongoosejs.com/docs/api/connection.html

## Issues Found
- The post originally told readers to deploy the stack through Portainer's Web Editor while using repo-relative bind mounts like `./backend`, `./frontend`, and `./mongo/init.js`. Portainer's relative path support is documented for Git-based stack deployments with Relative path volumes enabled, so the step was corrected to use `Git Repository`, Relative path volumes, and a writable Local filesystem path.
- The prerequisites were too broad for the shown development workflow. The post now states that the bind-mount development setup requires Portainer Business Edition on a Docker Standalone environment, while Portainer CE can still be used for the production image-based deployment.
- The project tree omitted the `mongo/init.js` file that the Compose file mounts. The structure was corrected so the documented layout matches the compose example.
- The Compose snippet used the obsolete top-level `version` field. It was removed to match current Compose guidance.
- The MongoDB initialization script created an application user, but the backend connection string used the MongoDB root account instead. The backend now connects as `meanuser`, which matches the created application user and the database initialization step.
- The backend CORS example hard-coded `http://localhost:4200`. It was updated to read `CORS_ORIGIN` from the environment with the existing localhost value as the default, so the example still works locally while remaining configurable.
- The Angular environment example hard-coded `localhost` without clarifying that this only works when the browser reaches the backend on the same host. A note was added to replace `localhost` with the Docker host when the stack is accessed remotely.
- The `mongo-express` example used older environment variables and a deprecated basic-auth toggle. It was updated to use `ME_CONFIG_MONGODB_URL` and `ME_CONFIG_MONGODB_ENABLE_ADMIN`, and the text now clearly marks mongo-express as a private-development-only tool.
- The backend production Dockerfile used `npm ci --only=production`. It was updated to `npm ci --omit=dev`, which matches current npm documentation.
- The frontend production Dockerfile assumed Angular output would always be in `dist/frontend/browser`. Angular's documented output path depends on the project configuration and builder, so the Dockerfile was updated to copy the built app from whichever standard Angular output directory contains `index.html`.
- The verification section said `docker ps | grep mean` checks that containers are healthy, but the compose file defines no healthchecks. The wording was corrected to say it verifies that the containers are running.
- The direct `mongosh` command omitted `--authenticationDatabase admin` even though the root user is created in the `admin` database. The command was corrected accordingly.
- The conclusion implied mongo-express was a generic production administration tool. It now reflects the project's own security guidance that it should remain private and not be exposed in production.

## Review Notes
- The Compose file still uses plain `depends_on`, which controls startup order but does not wait for MongoDB readiness. That is acceptable for a lightweight tutorial, but a production-oriented stack would benefit from explicit healthchecks and `service_healthy` dependencies.
- The examples were reviewed against current official documentation and current upstream image/docs behavior as of 2026-04-24. They were not executed in a live Portainer environment during this review.
