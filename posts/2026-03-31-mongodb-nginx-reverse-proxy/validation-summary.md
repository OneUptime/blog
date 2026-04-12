# Validation Summary: How to Use MongoDB with Nginx as a Reverse Proxy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Nginx 1.25 (HTTP reverse proxy and stream/TCP proxy)
- Docker Compose
- Node.js with Express
- MongoDB Node.js driver (MongoClient, ObjectId)

## Sources Consulted
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx stream module documentation: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- Nginx rate limiting documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- MongoDB Docker image documentation: https://hub.docker.com/_/mongo
- MongoDB Node.js driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- Docker Compose specification: https://docs.docker.com/compose/compose-file/

## Issues Found
1. **`mongod --auth` without credentials (broken setup)**: The Docker Compose started MongoDB with `--auth` which enables access control, but no initial user was created (no `MONGO_INITDB_ROOT_USERNAME`/`MONGO_INITDB_ROOT_PASSWORD` environment variables) and the connection string `mongodb://mongo:27017/appdb` contained no credentials. Since the `api` container connects over the Docker bridge network (not localhost), the MongoDB localhost exception does not apply. The app would fail to authenticate. **Fix:** Removed `--auth` from the `mongod` command since authentication setup is out of scope for this Nginx-focused tutorial.

## Review Notes
- The `version: "3.8"` key in Docker Compose is considered obsolete by Docker Compose V2 and is ignored, but it does not cause errors. Future updates could remove it.
- The Nginx configuration snippets are shown as partial configs. Since the Docker Compose mounts the file as `/etc/nginx/nginx.conf`, a complete config would need `events {}` and `http {}` wrapper blocks. This is a common blog post convention and not an error per se, but readers assembling a working config from the snippets will need to add those wrappers.
- The `deploy.replicas: 2` directive works in Docker Compose V2 but was originally a Swarm-only feature. Readers using the older `docker-compose` (V1) binary would need `docker-compose up --scale api=2` instead.
- The Node.js code does not handle invalid ObjectId input or MongoDB connection errors, which is acceptable for a tutorial but should not be copied directly into production.
