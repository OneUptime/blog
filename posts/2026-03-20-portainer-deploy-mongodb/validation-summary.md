# Validation Summary: How to Deploy MongoDB via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer stacks
- Docker Compose / Docker Engine
- MongoDB 7.0
- mongosh
- MongoDB Database Tools (`mongodump`, `mongorestore`)
- mongo-express

## Sources Consulted
- Portainer Documentation: How Relative Path Support works in Portainer — https://docs.portainer.io/sts/advanced/relative-paths
- Docker Official Image for MongoDB — https://hub.docker.com/_/mongo/
- Docker Official Image packaging for MongoDB (`Dockerfile-linux.template`) — https://github.com/docker-library/mongo/blob/master/Dockerfile-linux.template
- MongoDB Manual v7.0: Self-Managed Configuration File Options — https://www.mongodb.com/docs/v7.0/reference/configuration-options/
- MongoDB Manual: Connection Strings — https://www.mongodb.com/docs/current/reference/connection-string/
- MongoDB Shell Reference: Options — https://www.mongodb.com/docs/mongodb-shell/reference/options/
- MongoDB Database Tools: `mongodump` — https://www.mongodb.com/docs/manual/reference/mongodump/
- MongoDB Database Tools: `mongorestore` — https://www.mongodb.com/docs/database-tools/mongorestore/
- mongo-express README — https://github.com/mongo-express/mongo-express

## Issues Found
- The stack used `./mongod.conf` and `./init` as generic Portainer bind mounts. Portainer's relative-path support is a special Git-based workflow, not a safe general assumption for a basic stack deployment, so I changed these to explicit host paths and updated the file creation paths to match.
- The original MongoDB health check invoked `mongosh` without credentials even though the sample configuration enables authorization. I changed the health check to authenticate against the `admin` database so it remains valid with access control enabled.
- The `mongo-express` block set basic-auth credentials but did not enable basic auth. The current upstream configuration also documents `ME_CONFIG_MONGODB_URL` as the preferred connection setting. I updated the example to use `ME_CONFIG_MONGODB_URL`, added `ME_CONFIG_MONGODB_ENABLE_ADMIN: "true"`, and enabled `ME_CONFIG_BASICAUTH_ENABLED`.
- The `mongod.conf` snippet claimed `cacheSizeGB: 1.0` represented the MongoDB default of roughly 50% of RAM. That is incorrect because `1.0` is a fixed override. I corrected the comment and removed the file-based log path example, which would not work in the official container unless the parent log directory was created separately.
- The restore workflow copied the backup to the host and then restored from `/tmp/backup` inside the container without putting the host copy back. I added the missing `docker cp` step so the restore sequence matches the backup artifact shown in the guide.

## Review Notes
- `mongo:7.0` is a pinned major-version tag, and the examples were checked against MongoDB 7.x behavior.
- `mongo-express:latest` is functional, but a pinned tag would make the deployment more reproducible in the future.
- The `cacheSizeGB: 1.0` value is now correctly labeled as an example fixed cache size; it should still be tuned to the container's memory limit.
- Exposing `27017` on `0.0.0.0` is technically valid for a self-hosted deployment, but production deployments should restrict network access and avoid publishing the database port unless required.
