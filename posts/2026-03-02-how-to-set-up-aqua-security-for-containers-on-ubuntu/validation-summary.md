# Validation Summary: How to Set Up Aqua Security for Containers on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Trivy (Aqua's open-source vulnerability scanner)
- Aqua Community Edition (Aqua Server, Aqua Gateway)
- Aqua Enforcer
- aquactl (Aqua's CLI tool)
- Docker / Docker Compose
- PostgreSQL (as backing store for Aqua CE)
- Ubuntu Linux
- cron (for scheduled scans)

## Sources Consulted
- Trivy official docs (configuration): https://trivy.dev/latest/docs/configuration/
- Trivy CLI reference (trivy image): https://trivy.dev/latest/docs/references/configuration/cli/trivy_image/
- Trivy air-gapped docs: https://trivy.dev/latest/docs/advanced/air-gap/
- Aqua Security deployments repo (aquactl): https://github.com/aquasecurity/deployments
- Aqua Security Workshop docs: https://aqua.awsworkshop.io/configure_aqua/tools.html
- Trivy APT repository: https://aquasecurity.github.io/trivy-repo/deb

## Issues Found
- **`--skip-update` flag is deprecated.** In the air-gapped section, the post used `trivy image --skip-update your-image:tag`. Since Trivy v0.37.0, this flag was renamed to `--skip-db-update` (with a sibling `--skip-java-db-update` added). Updated the command to use `--skip-db-update`. Verified against the current Trivy CLI reference.

## Review Notes
- The Trivy installation steps via the official APT repo (`https://aquasecurity.github.io/trivy-repo/deb`) are correct.
- All Trivy commands (`trivy image`, `trivy rootfs`, `trivy fs`, `--severity`, `--input`, `--format`, `--output`, `--exit-code`, `--ignore-unfixed`, `--download-db-only`, `--config`) are valid and current.
- The `trivy.yaml` config keys (`severity`, `ignore-unfixed`, `cache-dir`, `format`) are valid.
- The `aquactl` tool and the download URL `https://get.aquasec.com/aquactl/stable/aquactl_linux_amd64.tar.gz` are legitimate (confirmed via Aqua's own deployments repo and the Aqua AWS workshop docs).
- The Aqua CE Docker Compose stack (postgres + aqua-server + aqua-gateway with `SCALOCK_*` env vars and ports 8080/8443/3622/8089) follows the historical Aqua CE pattern. Note that Aqua's commercial offerings have evolved; the `aquasec/aqua-server` image and `LICENSE_TOKEN` env variable still require a valid Aqua license for full functionality — readers without a license will not get a working web UI. The post does mention `LICENSE_TOKEN`, which is enough disclosure that this is not a freely usable stack out of the box.
- `version: "3.7"` at the top of the compose file is obsolete in Docker Compose v2 (the field is ignored but does not cause an error). Not a technical error.
- `postgres:12-alpine` is past PostgreSQL EOL (Nov 2024). It still pulls and runs, and may be what the Aqua Server expects for compatibility, so left unchanged.
- The Enforcer `docker run` command mounts `/var/run/docker.sock`, `/dev`, `/sys`, `/proc` with `--privileged` — these are consistent with Aqua Enforcer's documented requirements for runtime protection.
- The cron snippet, CI scan script, and bash scanning loop are syntactically valid and use correct Trivy options.
