# Validation Summary: How to Install and Configure Graylog on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Graylog 5.2 (open-source log management / SIEM)
- OpenSearch 2.x (search backend)
- MongoDB 6.0 (metadata/configuration store)
- OpenJDK 17 (JVM)
- Ubuntu 20.04 / 22.04
- rsyslog, Filebeat, Docker GELF log driver (log sources)

## Sources Consulted
- Graylog Compatibility Matrix — https://go2docs.graylog.org/current/downloading_and_installing_graylog/compatibility_matrix.htm
- Graylog "Upgrading to OpenSearch 2.x" docs — https://go2docs.graylog.org/5-0/planning_your_deployment/upgrading_to_opensearch_2.x.htm
- Graylog Plugins / Integrations setup docs — https://go2docs.graylog.org/current/what_more_can_graylog_do_for_me/plugins.html
- OpenSearch APT installation docs — https://opensearch.org/docs/latest/install-and-configure/install-opensearch/debian/
- MongoDB 6.0 install on Ubuntu docs — https://www.mongodb.com/docs/v6.0/tutorial/install-mongodb-on-ubuntu/
- ss(8) / iproute2 manual (UDP vs TCP socket listing)

## Issues Found
- **Incorrect troubleshooting command for UDP input.** The "Input Not Receiving Data" section used `ss -tlnp | grep 5140` to check the Syslog UDP input. The `-t` flag lists only TCP sockets, so a UDP listener on port 5140 (the Syslog UDP input configured earlier in the post) would never appear. Changed to `ss -ulnp` (UDP) so the command actually shows the listening socket, and clarified the comment. The accompanying `logger -n localhost -P 5140` test sends over UDP by default, which is consistent with this fix.

## Review Notes
- Version compatibility checks out: Graylog 5.2 supports MongoDB 5.x/6.x, OpenSearch 1.x/2.x (Elasticsearch 7.10 is the last supported ES, deprecated), and runs on Java 17 — all consistent with the post's prerequisites. OpenSearch 3.x is not supported, so the 2.x repository pin is correct.
- The `OPENSEARCH_INITIAL_ADMIN_PASSWORD` environment variable on install is required for OpenSearch 2.12+, so the command is correct for current 2.x packages.
- `is_leader`, `password_secret`, `root_password_sha2`, `elasticsearch_hosts`, `rotation_strategy = count`, `elasticsearch_max_docs_per_index`, and the email transport settings are all valid Graylog 5.x `server.conf` keys.
- The Filebeat config correctly uses `output.logstash` to feed Graylog's Beats input — Graylog's Beats input speaks the Lumberjack/Beats protocol that the Logstash output emits, so this is the right (if non-obvious) configuration.
- Minor, not changed: the basic "Beats" input ships in core `graylog-server`; installing `graylog-integrations-plugins` is not strictly required for it, though it is harmless and adds other integrations.
- Minor, not changed: the MongoDB repository line hardcodes the `jammy` (22.04) component. Users on 20.04 (focal) would technically want the focal repo, but the post recommends 22.04 and jammy packages work fine in practice.
- The `pwgen`, `sha256sum`, OpenSearch `vm.max_map_count`, deflector cycle API, and HTTPS/openssl steps are all accurate.
