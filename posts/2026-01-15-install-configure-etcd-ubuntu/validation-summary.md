# Validation Summary: How to Install and Configure etcd on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- etcd (v3.5.11) distributed key-value store
- Ubuntu (systemd service management)
- etcdctl / etcdutl command-line clients
- TLS certificate generation with cfssl / cfssljson
- Prometheus metrics integration
- Raft consensus (conceptual)

## Sources Consulted
- etcd v3.5 Configuration options: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd v3.5 membership reconfiguration: https://etcd.io/docs/v3.5/tutorials/how-to-deal-with-membership/
- etcd v3.5 Disaster recovery (snapshot save/restore): https://etcd.io/docs/v3.5/op-guide/recovery/
- etcd release assets (download URL format): https://github.com/etcd-io/etcd/releases
- etcd.conf.yml sample (config field names, metrics levels): https://github.com/etcd-io/etcd/blob/release-3.5/etcd.conf.yml.sample
- etcdctl/etcdutl deprecation discussion: https://github.com/etcd-io/etcd/issues/13863

## Issues Found
No technical issues found.

Spot-checked the items most likely to be wrong, all confirmed correct:
- Download URL pattern `etcd-v3.5.11-linux-amd64.tar.gz` from the `etcd-io/etcd` releases is valid, and the `etcd*` install glob correctly captures `etcd`, `etcdctl`, and `etcdutl`.
- Config file field names (`listen-client-urls`, `advertise-client-urls`, `initial-cluster`, `client-transport-security`, `peer-transport-security`, `auto-compaction-mode`, `quota-backend-bytes`, `snapshot-count`) match the v3.5 configuration reference.
- `metrics: 'extensive'` is a valid value (the alternatives being `basic`); confirmed against the v3.5 config docs.
- `etcdctl member add <name> --peer-urls=<url>` syntax is correct for v3.5.
- systemd unit with `Type=notify` is correct (etcd supports sd_notify readiness).
- TLS generation flow with cfssl/cfssljson, the `client-cert-auth: true` option, and the `ETCDCTL_CACERT`/`ETCDCTL_CERT`/`ETCDCTL_KEY` env vars are accurate.
- Key/value, watch (`--progress-notify`), lease (`grant`/`keep-alive`/`revoke`/`list`), interactive `txn`, auth (`user add`, `user grant-role`, `role grant-permission`, `auth enable`), and `endpoint health --cluster` / `defrag --cluster` commands are all valid v3.5 etcdctl usage.

## Review Notes
- Deprecation caveat: `etcdctl snapshot restore` and `etcdctl snapshot status` are deprecated as of etcd v3.5.x and are slated for removal in v3.6 — they are moving to the `etcdutl` administration utility (e.g. `etcdutl snapshot restore ...`, `etcdutl snapshot status ...`). They still function in the v3.5.11 release this post targets and only emit a deprecation warning, so the commands as written are not broken. `etcdctl snapshot save` is unaffected and remains in etcdctl (it operates over the network against a live server). Readers on v3.6+ should switch the restore/status commands to `etcdutl`. Left as-is because the post is explicitly pinned to v3.5.11 where the commands work.
- `etcdctl role grant-permission readwrite readwrite /app/` grants permission on the exact key `/app/` only; to cover the whole `/app/` keyspace a `--prefix` flag would be needed. Not incorrect as written, just narrower than the surrounding "app prefix" framing implies.
- `export ETCDCTL_API=3` is harmless but redundant on etcd v3.5, where the v3 API is the default.
- `etcdctl snapshot status /backup/etcd-*.db` relies on a shell glob that could match multiple files; intended as illustrative against a single snapshot.
