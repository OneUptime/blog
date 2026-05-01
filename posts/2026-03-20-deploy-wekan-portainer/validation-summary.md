# Validation Summary: How to Deploy Wekan (Kanban Board) via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Wekan
- Portainer
- Docker Compose
- MongoDB
- Wekan REST API
- curl

## Sources Consulted
- Wekan official Docker Compose example: https://raw.githubusercontent.com/wekan/wekan/main/docker-compose.yml
- Wekan Docker deployment documentation: https://github.com/wekan/wekan/wiki/Docker
- Wekan login and registration API docs: https://raw.githubusercontent.com/wekan/wekan/main/docs/API/REST-API.md
- Wekan boards API docs: https://raw.githubusercontent.com/wekan/wekan/main/docs/API/Boards.md
- Wekan cards API docs: https://raw.githubusercontent.com/wekan/wekan/main/docs/API/Cards.md
- Wekan user API docs: https://raw.githubusercontent.com/wekan/wekan/main/docs/API/User.md
- Wekan backup documentation: https://raw.githubusercontent.com/wekan/wekan/main/docs/Backup/Backup.md
- Wekan login/user setup docs: https://raw.githubusercontent.com/wekan/wekan/main/docs/Login/Adding-users.md
- Wekan source for first-user admin behavior: https://github.com/wekan/wekan/blob/main/server/models/users.js
- Wekan settings documentation for `ROOT_URL`: https://raw.githubusercontent.com/wekan/wekan/main/docs/Webserver/Settings.md
- Wekan MongoDB oplog guidance: https://raw.githubusercontent.com/wekan/wekan/main/docs/Databases/MongoDB-Oplog-Configuration.md
- MongoDB `mongod` reference for `--oplogSize`: https://www.mongodb.com/docs/v8.0/reference/program/mongod/
- MongoDB replica set oplog documentation: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB database tools docs for `mongodump`: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB database tools docs for `mongorestore`: https://www.mongodb.com/docs/database-tools/mongorestore/
- Portainer stack environment variable documentation: https://docs.portainer.io/2.21/user/docker/stacks/add

## Issues Found
- The post pinned `ghcr.io/wekan/wekan:v7.55`, which is an old unsupported Wekan release. Updated the image to `ghcr.io/wekan/wekan:latest` to match Wekan's current official Docker guidance.
- The MongoDB service used `mongod --oplogSize 128` without enabling a replica set. Wekan's current Docker guidance and MongoDB's oplog documentation require replica-set initialization for oplog-backed real-time updates. Updated the compose snippet to start MongoDB with `--replSet rs0` and initialize the single-node replica set automatically.
- The Wekan service omitted `MONGO_OPLOG_URL` and `METEOR_REACTIVITY_ORDER=oplog,polling`, which are part of Wekan's current MongoDB-backed Docker configuration for real-time updates. Added both environment variables.
- Step 3 told readers to open `http://<host>:8080` even though the stack config set `ROOT_URL` to `http://${WEKAN_DOMAIN}:8080`. Updated the instructions to use the exact configured `ROOT_URL`, which matches Wekan's settings documentation.
- The backup and restore commands did not follow Wekan's documented Docker backup flow and restored without `--drop`. Updated the commands to stop the app during backup/restore, dump to `/data/dump`, copy the dump out and back in, and restore with `mongorestore --drop --dir=/data/dump`.
- The conclusion described `--oplogSize 128` as a single-node deployment setting by itself. Updated the explanation to clarify that Wekan needs a single-node replica set plus `MONGO_OPLOG_URL`, and that `--oplogSize 128` applies when initializing that replica set's oplog.

## Review Notes
- The REST API examples are valid against Wekan's documented endpoints: `/users/login`, `/api/users/:id/boards`, and `/api/boards/:boardId/lists/:listId/cards`.
- Wekan's source code confirms that the first registered user becomes the instance admin via `Accounts.onCreateUser`, which sets `user.isAdmin = userCount === 0`.
- Using `latest` follows Wekan's current official compose file. For stricter reproducibility, a future revision could pin a current release tag instead of tracking `latest`.
