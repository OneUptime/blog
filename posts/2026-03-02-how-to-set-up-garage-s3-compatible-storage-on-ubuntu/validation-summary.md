# Validation Summary: How to Set Up Garage S3-Compatible Storage on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Garage (S3-compatible distributed object storage, v1.x series)
- Ubuntu 22.04 / 24.04
- systemd
- AWS CLI
- rclone
- UFW (firewall)
- Prometheus (metrics scraping)
- TOML (configuration format)

## Sources Consulted
- Garage configuration reference: https://garagehq.deuxfleurs.fr/documentation/reference-manual/configuration/
- Garage admin API reference: https://garagehq.deuxfleurs.fr/documentation/reference-manual/admin-api/
- Garage quick-start guide: https://garagehq.deuxfleurs.fr/documentation/quick-start/
- Garage real-world deployment cookbook: https://garagehq.deuxfleurs.fr/documentation/cookbook/real-world/
- Garage releases index: https://garagehq.deuxfleurs.fr/_releases.html
- rclone S3 backend documentation: https://rclone.org/s3/

## Issues Found

1. **Default ports swapped between RPC and S3 API.** The post originally listed `rpc_bind_addr` on port 3900 and the S3 API `api_bind_addr` on port 3901. Per the official Garage configuration reference and quick-start guide, the documented defaults are RPC on **3901** and S3 API on **3900**. Fixed in the prerequisites list, the TOML config, the AWS CLI examples, the rclone configuration, the UFW firewall rules, and the surrounding commentary so the entire post is internally consistent and matches upstream defaults.

2. **Wrong field name `s3_root_domain` in the `[s3_api]` section.** The correct field name is `root_domain` (the section already provides the `s3_` context). Corrected the commented-out example.

3. **`garage layout assign --capacity 100` missing unit suffix.** Garage v1.x requires a unit suffix (e.g., `G`, `T`) on the `--capacity` flag — the official cookbook example uses values like `1T`. Without a unit, Garage rejects the value. Changed to `--capacity 100G`.

4. **Health endpoint path `/v1/health` does not exist.** The admin API health endpoint is `/health` (no version prefix), per the admin API reference. Versioned admin endpoints live under `/v2/` (and previously `/v0/`), but the health check is intentionally unversioned. Corrected the `curl` command in the Monitoring section.

## Review Notes
- The post's anchor "As of early 2026, the current stable release is in the v1.x series" was accurate at publication time; Garage v2.0 (and subsequently v2.3.0, released April 2026) shipped after the post was written. The v1.0.1 download URL still resolves, the v1.x configuration schema used here is still valid, and the commands shown are still supported on v1.x, so the guide remains functional as-written. Readers wanting the latest may prefer v2.x, which introduces a `/v2/` admin API but is otherwise compatible with this single-node walkthrough.
- The `[admin]` section does not configure an `admin_token` or `metrics_token`. This is fine for the `/health` and `/metrics` endpoints used in the post (both are accessible without auth when no token is configured), but readers who want to call other admin endpoints will need to add one.
- On Ubuntu 24.04, `sudo apt install awscli` installs AWS CLI v1, which is older but works for the basic S3 operations shown. Users wanting v2 would need to install via the official AWS installer or snap.
