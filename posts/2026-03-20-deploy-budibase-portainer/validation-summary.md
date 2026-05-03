# Validation Summary: How to Deploy Budibase via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Budibase (open-source low-code platform)
- Portainer (Docker container management UI)
- Docker / Docker Compose
- CouchDB, MinIO, Redis, NGINX (bundled inside the Budibase all-in-one image)
- Budibase Public REST API

## Sources Consulted
- Official Budibase Docker docs: https://docs.budibase.com/docs/docker
- Budibase Docker Hub image listing: https://hub.docker.com/r/budibase/budibase
- Budibase Docker Hub tags API: https://hub.docker.com/v2/repositories/budibase/budibase/tags
- Budibase hosting docker-compose reference: https://github.com/Budibase/budibase/blob/master/hosting/docker-compose.yaml
- Budibase Public API docs: https://docs.budibase.com/docs/public-api
- Budibase Application search reference: https://docs.budibase.com/reference/appsearch
- Budibase worker auth route source: https://github.com/Budibase/budibase/blob/master/packages/worker/src/api/routes/global/auth.ts
- GitHub issue confirming `BB_ADMIN_USER_EMAIL` / `BB_ADMIN_USER_PASSWORD`: https://github.com/Budibase/budibase/issues/5851

## Issues Found

1. **Outdated/non-existent image tag.** The post pinned `budibase/budibase:2.27.4`. There is no 2.27.4 release on Docker Hub — the current series is 3.x, with `3.37.2` as the latest tag at the time of review. Updated the compose snippet to `budibase/budibase:3.37.2`.

2. **Incorrect Public API endpoint and header for listing applications.** The post used `GET /api/applications` with an `x-budibase-auth: <token>` header. Budibase exposes its Public API under `/api/public/v1/...` and authenticates with the `x-budibase-api-key` header (generated from the Budibase portal user dropdown). Updated the curl example to `GET http://budibase-host/api/public/v1/applications` with `x-budibase-api-key: <your-api-key>`, and clarified that the key must be generated from the portal.

## Review Notes
- The user-login endpoint `POST /api/global/auth/default/login` (where `default` is the tenant ID) was confirmed against the worker source — kept as-is.
- The `BB_ADMIN_USER_EMAIL` / `BB_ADMIN_USER_PASSWORD` variables, port `80`, the `/data` volume, and the `JWT_SECRET` / `INTERNAL_API_KEY` / `MINIO_*` / `REDIS_PASSWORD` / `COUCHDB_*` env vars all match the official all-in-one image documentation.
- The "2 GB RAM" prerequisite is on the lean side — official docs recommend 2 CPU cores and 4 GB RAM for most deployments — but Budibase will run on less, so this was not flagged as an error.
- The single-container all-in-one image is convenient but not recommended for production by Budibase; the post correctly notes that production deployments should externalize MinIO/S3 and consider an external database. (Worth noting: Budibase's own production guidance is to use the multi-service compose file under `hosting/` rather than the bundled image, but that is a recommendation rather than a correctness issue.)
