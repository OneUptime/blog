# Validation Summary: How to Use Podman for E-Commerce Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman pods, rootless containers, Quadlet/systemd integration, and `podman compose`
- WordPress and WooCommerce
- MariaDB
- Redis
- Node.js and Express
- PostgreSQL
- Elasticsearch
- systemd user services and timers

## Sources Consulted
- Podman `podman-pod-create` reference — https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman-run` reference — https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman Quadlet / `podman-systemd.unit` reference — https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman compose` reference — https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- WordPress Docker Official Image docs — https://hub.docker.com/_/wordpress
- MariaDB Docker Official Image docs — https://hub.docker.com/_/mariadb
- MariaDB Docker image environment variables — https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/mariadb-server-docker-official-image-environment-variables
- MariaDB container backup and restoration docs — https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/container-backup-and-restoration
- PostgreSQL Docker Official Image docs — https://github.com/docker-library/docs/blob/master/postgres/README.md
- npm `npm ci` docs — https://docs.npmjs.com/cli/v10/commands/npm-ci/
- node-postgres Pool API — https://node-postgres.com/apis/pool
- node-postgres Result API — https://node-postgres.com/apis/result
- Elastic Docker install docs — https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html
- Elastic local Docker example for Elasticsearch — https://www.elastic.co/docs/reference/search-connectors/api-tutorial
- Elastic single-node Docker example — https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-basic

## Issues Found
1. **Security claim about rootless Podman was too absolute.** The post said there was "no escalation path" from a container breakout to full host access. Podman’s docs support a narrower claim: rootless containers cannot gain more privileges than the user who launched them. I revised the sentence to reflect the documented security boundary instead of making an unconditional guarantee.

2. **The Node.js container build used an outdated install flag.** The Dockerfile used `npm ci --production`. I changed it to `npm ci --omit=dev`, which matches current npm documentation.

3. **The sample Express storefront code was incomplete and returned the wrong shape for PostgreSQL query results.** `db` was undefined, and `node-postgres` returns a `Result` object with data in `result.rows`. I added a `pg` pool initialization and changed the API responses to return `rows` / `rows[0]`.

4. **The Elasticsearch example used the wrong image source and an incomplete modern configuration.** The post referenced `docker.io/library/elasticsearch:8.12.0`, but Elastic’s official Docker images are published from `docker.elastic.co`. I updated the example to the current official image path, marked it as development/testing only, added the documented local-only security settings, and replaced the unsupported heap example with a container memory limit more aligned with current Elastic docs.

5. **The WordPress uploads bind-mount example was not runnable as written.** It reused the `ecom-wp` container name without replacement and omitted the required WordPress database environment variables. I added `--replace` and the database settings so the snippet works as a replacement for the earlier WordPress container.

6. **The Quadlet backup example misused `Pod=` and was not actually a timer.** In Quadlet, `Pod=` links to an existing `.pod` unit, but the post created the pod manually with `podman pod create`. The snippet also claimed to show a timer while only defining a `.container` file. I replaced it with a correct user-level systemd service and timer pair, and added the command to enable the timer.

7. **The compose section implied built-in compose support that Podman does not provide by itself.** Current Podman docs state that `podman compose` is a wrapper around an external compose provider. I updated the section to use the official `podman compose` command and clarified that a provider such as `podman-compose` or `docker-compose` must be installed.

## Review Notes
- MariaDB still supports the `MYSQL_*` environment variable aliases used earlier in the post, but MariaDB’s current documentation prefers `MARIADB_*` variables on 10.6+ images.
- The Elasticsearch example is now correctly labeled for local development or testing. A production Elasticsearch deployment for e-commerce would need security enabled and additional host/container tuning beyond this post, including the production guidance in Elastic’s Docker documentation.
- I did not find issues with the Podman pod networking examples, the Redis container invocation, the PostgreSQL container environment variables, or the use of `mariadb-dump` for logical backups.
