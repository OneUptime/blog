# Validation Summary: How to Install and Configure Harbor on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Harbor (container registry) v2.9.1
- Docker / Docker Compose
- Trivy (vulnerability scanner)
- Cosign / Notary (image signing)
- OpenSSL (certificate generation)
- Let's Encrypt / certbot
- PostgreSQL (Harbor database)
- Kubernetes (image pull secrets)
- Harbor REST API v2.0

## Sources Consulted
- Harbor releases page — https://github.com/goharbor/harbor/releases (confirmed v2.9.1 exists, released 2 Nov)
- Harbor `make/install.sh` (main branch) — https://github.com/goharbor/harbor/blob/main/make/install.sh (confirmed accepted flags are `--help` and `--with-trivy`; `--with-notary` is rejected with an error)
- "Harbor Deprecates Notary v1 Support in v2.9.0" — https://github.com/goharbor/harbor/wiki/Harbor-Deprecates-Notary-v1-Support-in-v2.9.0
- Harbor v2.9 release blog — https://goharbor.io/blog/harbor-2.9/
- Harbor docs: Run the Installer Script — https://goharbor.io/docs/2.1.0/install-config/run-installer-script/
- Harbor docs: image signing with Cosign — https://goharbor.io/docs/latest/working-with-projects/working-with-images/sign-images/

## Issues Found
1. **Notary listed as a feature / `--with-notary` install flag (incorrect for v2.9.1).** The post installs Harbor v2.9.1 but listed "Image signing (Notary)" as a feature and showed `sudo ./install.sh --with-trivy --with-notary` as an install option. Notary was deprecated in Harbor 2.6 and **removed in Harbor 2.9.0** — it is no longer in the UI or backend, and the v2.9.x `install.sh` explicitly errors if `--with-notary` is passed ("Please do NOT set --with-notary, as notary has been deprecated and removed"). This command would fail.
   - **Fix:** Changed the feature bullet to "Image signing (Cosign)", removed the `--with-notary` install command, and added a note explaining that Notary was removed in 2.9 and that image signing is now handled via Cosign (no extra install flag required).

## Review Notes
- Harbor v2.9.1 is confirmed to exist; the download URL and offline-installer filename are correct.
- The remaining technical content is accurate: the OpenSSL self-signed certificate workflow (CA → server key → CSR → v3.ext SAN → signed cert → `.cert` conversion → `/etc/docker/certs.d/`) matches Harbor's documented procedure; the `harbor.yml` fields (hostname, http/https, external_url, harbor_admin_password, database, data_volume, storage_service, trivy, log) are valid; the REST API v2.0 endpoints (`/api/v2.0/projects`, `/repositories`, `/artifacts/.../additions/vulnerabilities`, `/health`) are correct; container names (`harbor-db`, `core`, `registry`, `trivy-adapter`) and the PostgreSQL backup/restore via `pg_dump -U postgres registry` match the default deployment; the Kubernetes robot-account secret format (`robot$project+name`) is correct.
- Version caveat for readers: Harbor 2.9 requires Docker 20.10.10+ and PostgreSQL >= 12 for external databases. Newer Harbor releases (2.10+) are available; the procedure remains the same but the version number/URL would need updating.
