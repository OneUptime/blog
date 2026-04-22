# Validation Summary: How to Run Init Containers Using Portainer - Run

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker containers
- Flyway
- PostgreSQL
- Kubernetes Deployments
- Kubernetes init containers
- YAML configuration

## Sources Consulted
- Docker Docs: Compose `depends_on` conditions, including `service_healthy` and `service_completed_successfully`: https://docs.docker.com/reference/compose-file/services/#depends_on
- Docker Docs: Compose top-level `version` element is obsolete: https://docs.docker.com/reference/compose-file/version-and-name/
- Kubernetes Docs: Init containers run to completion before app containers and run sequentially: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Docs: Deployment `.spec.selector` is required and must match pod template labels in `apps/v1`: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#selector
- Portainer Docs: Kubernetes applications can be created from code, including manifests through the web editor: https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Portainer Docs: Creating an application from a manifest and using the web editor: https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Flyway Docker image documentation: https://hub.docker.com/r/flyway/flyway/
- Redgate Flyway Docs: `FLYWAY_URL` environment variable: https://documentation.red-gate.com/fd/environment-url-setting-277578933.html
- Redgate Flyway Docs: `FLYWAY_USER` environment variable: https://documentation.red-gate.com/fd/environment-user-setting-277578934.html
- Redgate Flyway Docs: `FLYWAY_PASSWORD` environment variable: https://documentation.red-gate.com/flyway/reference/configuration/environments-namespace/environment-password-setting
- PostgreSQL Docs: `pg_isready` command and options: https://www.postgresql.org/docs/current/app-pg-isready.html

## Issues Found
- The first Docker Compose example used `version: "3.8"`. Docker Compose now treats the top-level `version` property as obsolete and only informative, so it was removed.
- The multiple-init-step Docker Compose snippet depended on a `postgres` service but did not define it. Added the `postgres` service so the snippet is internally consistent.
- The multiple-init-step Flyway service ran `migrate` without the connection settings or migration volume needed for the command to work. Added `FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD`, and the migrations volume.
- The Kubernetes Flyway init container only supplied `FLYWAY_URL`. Added `FLYWAY_USER` and `FLYWAY_PASSWORD` so the example includes the database credentials needed for the migration.
- The Kubernetes Deployment manifest omitted the required `spec.selector` and matching `spec.template.metadata.labels`. Added matching labels for `app: myapp`.
- The Portainer Kubernetes deployment path referenced "Stacks > Add Stack > Kubernetes > Paste manifest", which does not match the current Portainer Kubernetes documentation. Updated it to "Applications > Create from code > Manifest > Web editor".

## Review Notes
- The core guidance is technically correct: Docker Compose can model one-shot setup containers with `depends_on.condition: service_completed_successfully`, and Kubernetes supports native `initContainers` that run sequentially before app containers.
- The examples still use placeholder application images, credentials, and migration paths. Those are acceptable for a tutorial, but production usage should replace hard-coded passwords with secrets.
