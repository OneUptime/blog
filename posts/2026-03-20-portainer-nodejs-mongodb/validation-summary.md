# Validation Summary: How to Deploy a Node.js + MongoDB Stack via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker
- Node.js
- Express
- MongoDB
- Mongoose
- mongo-express
- npm

## Sources Consulted
- Portainer docs, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- Portainer docs, "How Relative Path Support works in Portainer": https://docs.portainer.io/advanced/relative-paths
- Portainer docs, "Requirements and prerequisites": https://docs.portainer.io/start/requirements-and-prerequisites
- Docker docs, Compose file reference for `services`, `depends_on`, and `healthcheck`: https://docs.docker.com/reference/compose-file/services/
- Docker Hub official `mongo` image documentation: https://hub.docker.com/_/mongo/
- MongoDB docs, connection strings and `authSource`: https://www.mongodb.com/docs/current/reference/connection-string/
- MongoDB docs, `mongosh` options: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- MongoDB docs, authenticating users on self-managed deployments: https://www.mongodb.com/docs/v6.1/tutorial/authenticate-a-user/
- Mongoose docs, middleware: https://mongoosejs.com/docs/middleware.html
- Mongoose docs, connection `readyState`: https://mongoosejs.com/docs/api/connection.html
- mongo-express official README: https://github.com/mongo-express/mongo-express
- npm docs, config reference for deprecated `only` and `--omit=dev`: https://docs.npmjs.com/cli/v10/using-npm/config

## Issues Found
- The stack mounted `./mongo/init.js` while the instructions explicitly used Portainer's Web Editor. I updated the guide to save the script as `/opt/node-mongo-app/mongo/init.js` on the Docker host and mounted that absolute path so the deployment flow matches the instructions.
- The MongoDB healthcheck ran an unauthenticated `mongosh` ping even though `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` enable authentication. I updated the healthcheck to authenticate against the `admin` database.
- The API connected with the root account even though the init script created a dedicated `nodeuser` application account in `nodeapp`. I updated `MONGODB_URI` to use the application user with `authSource=nodeapp`.
- The mongo-express configuration used an incomplete/outdated environment-variable pattern. I updated it to use `ME_CONFIG_MONGODB_URL`, `ME_CONFIG_MONGODB_ENABLE_ADMIN: "true"`, and `ME_CONFIG_BASICAUTH_ENABLED: "true"` so the admin UI and HTTP auth are configured according to the current upstream docs.
- The Dockerfile used `npm ci --only=production`, which npm now documents as deprecated in favor of `--omit=dev`. I updated the command accordingly.
- The Mongoose pre-save hook mixed an `async` function with `next()`. I updated it to promise-based async middleware, which matches the documented pattern.
- The post claimed replica-set coverage in the description/commentary without actually configuring a replica set. I removed those claims and left replica sets as a future production consideration in the conclusion.
- The prerequisite `Docker Engine 20.10+` no longer matches current Portainer support guidance. I updated it to require a supported Docker Engine release instead of naming an outdated floor.
- The Express startup log printed `process.env.PORT` even when the fallback port was used. I updated the snippet to log the resolved port value.

## Review Notes
- The post is now technically consistent, but the example still contains placeholder credentials such as `adminpassword` and `nodepassword`; these should be replaced before any real deployment.
- `mongo-express` is useful for administration, but it should stay on a private/internal network or be removed from hardened production deployments.
- `JWT_SECRET` appears in the stack environment example, but no JWT-related code is shown in the included application snippets.
- The review was documentation-based. I did not run a live Portainer deployment from this workspace.
