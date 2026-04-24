# Validation Summary: How to Test Portainer Backup Restoration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker
- Portainer HTTP API
- `curl`
- `jq`

## Sources Consulted
- Portainer Documentation, "General" (backup and restore): https://docs.portainer.io/admin/settings/general
- Portainer Documentation, "Install Portainer CE with Docker on Linux": https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Documentation, "CLI configuration options": https://docs.portainer.io/sts/advanced/cli
- Portainer Documentation, "API usage examples": https://docs.portainer.io/sts/api/examples
- Portainer Documentation, "What does Portainer's backup include?": https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer Documentation, "Accessing the Portainer API": https://docs.portainer.io/2.21/api/access
- Docker Docs, "Volumes": https://docs.docker.com/engine/storage/volumes/
- Docker Docs, "docker container run": https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- The post instructed readers to untar the backup directly into the test volume. Portainer's documented restore procedure is to start a fresh instance with an empty data volume and use "Restore Portainer from backup" during initial setup. I replaced the unsupported tar extraction flow with the documented restore workflow.
- The post used `http://localhost:9100` and mapped `9100:9000` as if HTTP on port `9000` were the default UI path. Current Portainer install docs default to HTTPS on `9443`, typically with a self-signed certificate. I updated the example to use `https://localhost:9444` and added `curl -k` so the API examples work against the default certificate.
- The comparison example relied on `PROD_TOKEN` and `TEST_TOKEN` without defining both values and used quoted JSON output for stack names. I added token generation for both instances and switched the `jq` filter to raw output so the `diff` command works as written.
- The scheduling section suggested automating a restore test with a cron-triggered script. Portainer's documented restore flow from backup is available during initial setup on a fresh instance, not as a documented CLI automation flow. I removed the unsupported automation example and kept the guidance as a recurring manual test.

## Review Notes
- Portainer backups contain Portainer configuration and metadata, including users, environments, and stack definitions, but they do not include containers, images, volumes, or application data stored outside Portainer's own database.
- The examples assume the default HTTPS UI on `9443`. If a deployment still exposes legacy HTTP on `9000`, the URLs and ports need to be adjusted accordingly.
- Using the same Portainer image tag as production is the safest way to validate restore compatibility.
