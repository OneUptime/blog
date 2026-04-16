# Validation Summary: How to Install ClickHouse on ARM Architecture

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- ClickHouse (server and client)
- ARM64 / AArch64 architecture (AWS Graviton, Ampere Altra, Raspberry Pi 4)
- Debian/Ubuntu APT package management
- Docker (multi-arch manifests)
- Linux CPU frequency scaling (`cpufreq` governor)
- ClickHouse `system.build_options` system table

## Sources Consulted
- ClickHouse official install docs: https://clickhouse.com/docs/install
- ClickHouse install script: https://clickhouse.com/ (the shell script downloaded by `curl https://clickhouse.com/ | sh`)
- ClickHouse GitHub release `v24.3.3.102-lts` asset list (verified via `gh release view`)
- ClickHouse builds CDN: https://builds.clickhouse.com/master/aarch64/clickhouse
- Docker Hub `clickhouse/clickhouse-server` multi-arch image manifests

## Issues Found
- **Broken single-binary download URL.** The post pointed to `https://github.com/ClickHouse/ClickHouse/releases/download/v${VERSION}-lts/clickhouse-linux-${ARCH}`. Verified via `gh release view v24.3.3.102-lts` that no such asset exists — the release only ships `*.tgz`, `*.deb`, `*.rpm` packages plus `clickhouse-macos` / `clickhouse-macos-aarch64` (no Linux raw binary). A direct `HEAD` against the URL also returned 404. Replaced with the official `https://builds.clickhouse.com/master/aarch64/clickhouse` URL (which is what the upstream `curl https://clickhouse.com/ | sh` script resolves to for AArch64), and added the install-script alternative for completeness, since it also handles the `aarch64v80compat` fallback for older ARMv8.0 cores.

## Review Notes
- The Debian/Ubuntu repo install commands match the current upstream documentation, including the GPG key URL `https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key` (the same key signs both DEB and RPM packages). The official docs additionally include `arch=${ARCH}` inside the `[signed-by=...]` stanza; omitting it still works because APT auto-detects the host architecture, but adding it is a minor hardening that future revisions could adopt.
- Version `24.3.3.102` is a real LTS release but is now ~2 years old (newer LTS lines such as 24.8 and 25.3 have shipped since). Since the install script and APT repo always pull current versions, the only place where this matters is the (now-removed) GitHub-asset URL.
- The `--ulimit nofile=262144:262144` Docker flag and ports `8123`/`9000` match upstream guidance.
- The `system.build_options` query is a valid ClickHouse system table; filtering on `name LIKE '%ARCH%'` will surface CPU dispatch / target-arch options.
- The `cpufreq` governor command is correct shell, but on many cloud Graviton instances the `cpufreq` sysfs entries are not exposed (the hypervisor manages frequency); the command will silently no-op or error per-CPU in that case. Not a correctness bug, just a caveat readers should be aware of.
