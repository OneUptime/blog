# Validation Summary: How to Deploy Redash for SQL-Based Data Visualization on RHEL

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Redash
- RHEL
- Docker Engine
- Docker Compose
- PostgreSQL
- Redis
- SQL
- firewalld

## Sources Consulted
- Redash official setup documentation: https://redash.io/help/open-source/setup/
- Redash official secret keys documentation: https://redash.io/help/open-source/admin-guide/secrets/
- Redash official Docker Compose configuration: https://github.com/getredash/setup/blob/master/data/compose.yaml
- Redash official setup script: https://github.com/getredash/setup/blob/master/setup.sh
- Redash official Docker Hub image page: https://hub.docker.com/r/redash/redash/
- Docker official RHEL installation documentation: https://docs.docker.com/engine/install/rhel/
- Docker Compose official version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Redash supported data sources documentation: https://redash.io/help/data-sources/querying/supported-data-sources/
- Redash official alert setup documentation: https://redash.io/help/user-guide/alerts/setting-up-an-alert/
- Redash official getting started documentation: https://redash.io/help/user-guide/getting-started/

## Issues Found
- The architecture diagram included Nginx, but the provided Docker Compose file did not define an Nginx service and the guide exposes Redash directly on port 5000. I removed Nginx from the diagram so it matches the actual deployment.
- The Docker installation command omitted `docker-buildx-plugin`, which Docker's current RHEL installation documentation includes in the standard Docker Engine package set. I added it to the `dnf install` command.
- The environment setup generated only `REDASH_COOKIE_SECRET`. Redash documentation requires manually deployed Docker Compose installations to set both `REDASH_COOKIE_SECRET` and `REDASH_SECRET_KEY`; `REDASH_SECRET_KEY` is used for encrypted fields such as data source secrets. I added generation of `REDASH_SECRET_KEY`.
- The Compose file used the obsolete top-level `version: '3.8'` field. Docker Compose now treats this field as only informative and warns that it is obsolete. I removed it from the snippet.

## Review Notes
The post remains a valid Redash-on-RHEL deployment tutorial after the fixes. The Compose stack is simpler than Redash's current reference Compose file, which splits workers by queue and includes an optional Nginx service, but the simplified stack is technically coherent for a basic single-server deployment.
