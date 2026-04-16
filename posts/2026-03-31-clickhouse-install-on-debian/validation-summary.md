# Validation Summary: How to Install ClickHouse on Debian

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- ClickHouse (server and client packages)
- Debian 11 (Bullseye) / Debian 12 (Bookworm)
- APT package manager
- systemd (service management, disable-thp unit)
- GPG / apt keyring (signed-by)
- PAM limits (`/etc/security/limits.d`)
- Linux transparent huge pages

## Sources Consulted
- Official ClickHouse install docs: https://clickhouse.com/docs/install and https://clickhouse.com/docs/install/debian_ubuntu
- ClickHouse packages host verification: `https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key` (HTTP 200), `https://packages.clickhouse.com/deb/archive/keyring.gpg` (HTTP 404), `https://packages.clickhouse.com/deb/archive/apt/stable.sources` (HTTP 404)
- ClickHouse user configuration docs for `password_sha256_hex` under `users.xml` / `users.d/*.xml`
- systemd unit file reference (oneshot services, `multi-user.target`)

## Issues Found
1. **Incorrect attribution of the repository.** The post opened with "Altinity's official APT repository," but `packages.clickhouse.com` is maintained by ClickHouse Inc., not Altinity (Altinity publishes its own separate builds). Fixed to "ClickHouse's official APT repository."
2. **Broken GPG keyring URL.** The post used `https://packages.clickhouse.com/deb/archive/keyring.gpg`, which returns HTTP 404. Replaced with the URL documented in the official install guide: `https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key`. Also renamed the local keyring file from `clickhouse-archive-keyring.gpg` to `clickhouse-keyring.gpg` to match official docs, and updated the `signed-by=` reference accordingly.
3. **Added `arch=${ARCH}` to the sources line.** The official install snippet includes `arch=${ARCH}` (derived from `dpkg --print-architecture`) in the sources stanza. Added this so the repository is correctly scoped to the host's architecture.
4. **Removed non-existent alternative sources-file snippet.** The "single-file sources format" section referenced `https://packages.clickhouse.com/deb/archive/apt/stable.sources`, which also returns HTTP 404. That alternative does not exist on the ClickHouse packages host and was removed to avoid sending readers to a broken URL.

## Review Notes
- The pinned example version `24.3.1.2672` is a real ClickHouse 24.3 LTS release and is still reachable via APT; readers pinning to a specific version should check current LTS tags periodically.
- `sha256sum` produces a lowercase hex digest, which is what `password_sha256_hex` expects — correct as written.
- The `disable-thp` unit writes only `transparent_hugepage/enabled`; on some kernels you may also want to write `transparent_hugepage/defrag`, but setting only `enabled` to `never` matches common ClickHouse guidance and is sufficient.
- The post does not mention that ClickHouse 23.3+ requires at least Debian 11 (kernel/glibc requirements); readers on Debian 10 would need the older LTS line. Not an error in the post, just a caveat.
- Post-installation, operators may also want to review `/etc/clickhouse-server/config.d/` for listen host, default database paths, and ZooKeeper/Keeper settings before going to production; beyond the scope of this install guide.
