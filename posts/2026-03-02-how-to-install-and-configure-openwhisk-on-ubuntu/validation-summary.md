# Validation Summary: How to Install and Configure OpenWhisk on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache OpenWhisk
- Ubuntu
- Docker
- Docker Compose
- OpenWhisk wsk CLI
- JavaScript actions
- Python actions
- OpenWhisk web actions
- OpenWhisk triggers, rules, catalog, and alarms feed provider

## Sources Consulted
- Apache OpenWhisk README and quick start: https://github.com/apache/openwhisk
- Apache OpenWhisk Docker Compose devtools README: https://github.com/apache/openwhisk-devtools/tree/master/docker-compose
- Apache OpenWhisk Docker Compose Makefile: https://github.com/apache/openwhisk-devtools/blob/master/docker-compose/Makefile
- Apache OpenWhisk CLI README: https://github.com/apache/openwhisk-cli
- Apache OpenWhisk CLI 1.2.0 release assets: https://github.com/apache/openwhisk-cli/releases/tag/1.2.0
- Apache OpenWhisk CLI configuration docs: https://github.com/apache/openwhisk/blob/master/docs/cli.md
- Apache OpenWhisk actions docs: https://github.com/apache/openwhisk/blob/master/docs/actions.md
- Apache OpenWhisk JavaScript action docs: https://github.com/apache/openwhisk/blob/master/docs/actions-nodejs.md
- Apache OpenWhisk Python action docs: https://github.com/apache/openwhisk/blob/master/docs/actions-python.md
- Apache OpenWhisk web actions docs: https://github.com/apache/openwhisk/blob/master/docs/webactions.md
- Apache OpenWhisk alarms package README: https://github.com/apache/openwhisk-package-alarms
- Ubuntu package metadata for docker-compose and docker-compose-v2

## Issues Found
- The Docker Compose setup cloned unrelated repositories and then attempted to run raw `docker compose up`. The official devtools workflow uses `openwhisk-devtools/docker-compose` with `make quick-start`, which generates local environment files, initializes CouchDB, configures the CLI, and sets up API management. Updated the clone and startup commands accordingly.
- The prerequisites omitted tools used by the devtools Makefile, including `make`, `lsof`, `net-tools`, `rsync`, and a JDK. Added them and switched to the `docker-compose` command package because the devtools Makefile invokes `docker-compose`.
- The `.env` example used variables that are not consumed by the OpenWhisk devtools startup path. Replaced it with the supported `OPENWHISK_VERSION` and `DOCKER_IMAGE_TAG` environment variables.
- The readiness checks referenced a nonexistent `edge` Compose service and a questionable `/api/v1/info` URL. Replaced them with the invoker `/ping` check used by the devtools workflow.
- The wsk CLI download command saved the tarball as `wsk`, then tried to extract a different filename. Corrected the output filename and install permissions.
- Local CLI commands need `-i` when connecting to the self-signed local HTTPS endpoint. Added `-i` to OpenWhisk API operations.
- The web action example read `__ow_query` and `__ow_body`, which are passed through for raw web actions. Changed the action creation to `--web raw` and invoked the returned URL with a `.json` extension.
- The alarms trigger example assumed `/whisk.system/alarms` was already installed. Added the required `make add-catalog` and `make create-provider-alarms` commands before creating the feed trigger.
- The article described Docker Compose as suitable for small production workloads. Official docs position this path as local development/testing; updated that statement.

## Review Notes
The Docker Compose devtools deployment is useful for local testing, but Apache OpenWhisk's current README presents Standalone OpenWhisk as the easiest local quick start and Kubernetes as the documented development/production deployment path. A future revision could choose one path explicitly instead of mixing standalone, Kubernetes, and Docker Compose references.
