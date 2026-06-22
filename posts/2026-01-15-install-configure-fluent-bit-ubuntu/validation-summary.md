# Validation Summary: How to Install and Configure Fluent Bit on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- Fluent Bit (log processor and forwarder)
- Ubuntu (apt package management, systemd)
- Output integrations: Elasticsearch, Loki, Amazon S3, Kafka, CloudWatch, HTTP, Fluentd forward, file
- Input plugins: tail, systemd, cpu, mem, docker (metrics), tcp, syslog
- Filters: modify, grep, parser, kubernetes, lua
- Kubernetes (DaemonSet deployment)

## Sources Consulted
- Fluent Bit official manual — Docker Metrics input plugin: https://docs.fluentbit.io/manual/data-pipeline/inputs/docker-metrics
- Fluent Bit official manual — Tail input plugin (Docker_Mode options): https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluent Bit official manual — Downloads/installation: https://docs.fluentbit.io/manual/installation/downloads
- Fluent Bit official manual — Configuring Fluent Bit (`--dry-run`): https://docs.fluentbit.io/manual/administration/configuring-fluent-bit
- Fluent Bit GitHub release v2.2.0 assets: https://github.com/fluent/fluent-bit/releases/tag/v2.2.0

## Issues Found
1. **Method 2 "Download Binary" referenced a non-existent prebuilt tarball.** The post instructed downloading `https://github.com/fluent/fluent-bit/releases/download/v2.2.0/fluent-bit-2.2.0-linux-x86_64.tar.gz`. Verified the v2.2.0 release contains only auto-generated source archives (`v2.2.0.zip`, `v2.2.0.tar.gz`) — Fluent Bit does not publish generic prebuilt Linux x86_64 binary tarballs on GitHub. The download command would 404. Replaced the section with the correct, working alternative: building from source (retitled "Method 2: Build from Source") with proper build dependencies, clone, `cmake`/`make`, and `make install` steps.

2. **"Docker Logs" input used the wrong plugin and an invalid option.** The post used `Name docker` with `Docker_Mode On` to collect Docker logs. The `docker` input plugin collects container **metrics** (CPU/memory), not logs, and does not support `Docker_Mode`. `Docker_Mode` is an option of the `tail` plugin, used to reassemble Docker's split JSON log lines. Rewrote the example to use `tail` over `/var/lib/docker/containers/*/*.log` with the `docker` parser and `Docker_Mode On`, which is the correct way to collect Docker container logs.

3. **Misleading comment in Method 1.** The comment `# Add Fluent Bit GPG key` preceded the line that runs the full official `install.sh` script (which adds the repo, imports the key, and installs the package). Updated the comment to accurately describe that the script performs the full install.

## Review Notes
- The remaining configuration examples were verified as accurate: the `SERVICE`, `tail`, `systemd`, `cpu`, `mem`, `tcp`, and `syslog` inputs; `modify`, `grep`, `parser`, `kubernetes`, and `lua` filters; and the `es`, `loki`, `s3`, `kafka`, `cloudwatch_logs`, `http`, `forward`, and `file` outputs all use valid plugin names and option keys.
- The `--dry-run` flag, the HTTP monitoring API endpoints (`/api/v1/health`, `/api/v1/metrics`, `/api/v1/metrics/prometheus`, `/api/v1/uptime`), `Health_Check On`, and the Lua filter return convention (`return 1, timestamp, record`) are all correct.
- The official repository instructions (GPG key import, `jammy` repo line) are valid for Ubuntu 22.04. Users on newer Ubuntu releases (e.g. 24.04 "noble") should substitute the matching codename in the repo URL — worth a future note but not an error.
- The "~450KB" / "~2MB" resource-footprint figures are the project's own approximate marketing claims and vary by build/version; they are reasonable and not flagged as errors.
