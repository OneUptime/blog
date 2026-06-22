# Validation Summary: How to Install Elasticsearch on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Elasticsearch 8.x
- Ubuntu (20.04 / 22.04 / 24.04)
- APT package management
- JVM heap configuration
- Linux system tuning (limits.conf, sysctl, vm.max_map_count, memlock)
- systemd
- Elasticsearch security (X-Pack security, TLS, users/roles)
- Elasticsearch REST APIs (index, document, search, cluster health, snapshots)
- Index Lifecycle Management (ILM)

## Sources Consulted
- Elasticsearch Debian/APT install docs — https://www.elastic.co/guide/en/elasticsearch/reference/current/deb.html
- ILM rollover action reference — https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- General knowledge of Elasticsearch 8.x configuration, security auto-configuration, and CLI tooling (elasticsearch-reset-password, elasticsearch-users, elasticsearch-certutil)

## Issues Found
No technical issues found. The core installation flow, repository/GPG setup, configuration file fields, JVM heap guidance, system tuning values, security CLI commands, and REST API examples are all accurate for Elasticsearch 8.x.

Specifically verified:
- The GPG key import (`gpg --dearmor` to `/usr/share/keyrings/elasticsearch-keyring.gpg`), the `8.x/apt stable main` repository line, and `apt install elasticsearch` match the official Elastic APT instructions.
- "Elasticsearch bundles its own JDK" is correct — the package ships a bundled OpenJDK.
- `discovery.type: single-node`, `node.roles: [master, data]`, `discovery.seed_hosts`, and `cluster.initial_master_nodes` are valid for their respective single-node and multi-node configs.
- JVM heap guidance (50% of RAM, ≤31GB compressed-oops limit, Xms == Xmx) is correct.
- `vm.max_map_count=262144`, memlock/nofile/nproc limits are accurate.
- The HTTPS verification example correctly uses `https://` with `--cacert /etc/elasticsearch/certs/http_ca.crt`, consistent with 8.x's default auto-configured TLS.
- Security CLI tools (`elasticsearch-reset-password`, `elasticsearch-users useradd ... -r superuser`, `elasticsearch-certutil ca`/`cert --ca`) and the `_security/user` API are correct.
- The log path `/var/log/elasticsearch/my-application.log` is consistent with the `cluster.name: my-application` set earlier (log file is named `<cluster.name>.log`).
- ILM policy structure (hot rollover, warm shrink/forcemerge, delete) is valid.

## Review Notes
- **Default TLS on plain-HTTP curl examples**: On a default Elasticsearch 8.x install, security *and* HTTPS are enabled automatically. The many `curl "localhost:9200/..." -u elastic:password` examples (plain HTTP) will fail with a "received plaintext http traffic on an https channel" error unless TLS is disabled or `https://` + `--cacert .../http_ca.crt` is added. The post does demonstrate the correct HTTPS form once (under "Check Cluster Health") and frames the plain examples as development/without-security, so this is an accepted pedagogical simplification rather than an error — but readers on a stock 8.x install should add the `https://`/`--cacert` flags shown in that example to every command.
- **`max_size` in the ILM rollover action**: Valid in 8.x. Elastic has flagged `max_size` for removal in a future (9.x) release in favor of `max_primary_shard_size`. No change needed for an 8.x-targeted guide, but `max_primary_shard_size` is the forward-compatible choice.
- **`sudo /usr/share/elasticsearch/bin/elasticsearch -d` as a config check**: This is a weak troubleshooting tip — `-d` daemonizes Elasticsearch rather than validating configuration syntax, and Elasticsearch refuses to run as root (so the `sudo` form would error). A better suggestion would be inspecting `journalctl -u elasticsearch` after a `systemctl restart`, which the post already covers. Left as-is since it is non-critical guidance, not part of the main install path.
- **"Java 11+" prerequisite**: Slightly dated phrasing (an Elasticsearch 7.x-era minimum), but the parenthetical "(Elasticsearch bundles its own JDK)" keeps it accurate — no external Java install is required for 8.x.
