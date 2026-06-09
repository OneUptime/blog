# Validation Summary: How to Configure K3s with External Etcd Cluster

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- etcd v3.5.11 (distributed key-value store)
- TLS / OpenSSL (certificate generation for client and peer authentication)
- systemd (etcd service unit)
- Prometheus (etcd metrics scraping and alerting rules)
- Bash scripting (installation, backup, troubleshooting)
- Kubernetes API (kubectl, TLS SANs, load balancing)

## Sources Consulted
- K3s Datastore Configuration docs: https://docs.k3s.io/datastore
- etcd v3.5 Recovery Guide: https://etcd.io/docs/v3.5/op-guide/recovery/
- etcd v3.5 Metrics: https://etcd.io/docs/v3.5/metrics/
- etcd v3.5 Configuration flags (ETCD_* environment variables)
- etcd v3.5 release notes (etcdutl introduction)

## Issues Found
No technical issues found.

Detailed verification of each section:

- **K3s datastore flags** (`--datastore-endpoint`, `--datastore-cafile`, `--datastore-certfile`, `--datastore-keyfile`): confirmed correct against the official K3s datastore docs.
- **K3s server flags** (`--token`, `--node-ip`, `--tls-san`, `--disable=traefik`, `--disable=servicelb`, `--server`, `--write-kubeconfig-mode`): all valid current K3s flags.
- **etcd v3.5.11**: a real released version; install URL and tarball layout (`etcd`, `etcdctl`, `etcdutl` binaries) match the actual release artifacts.
- **etcd environment variables** in `/etc/etcd/etcd.conf` (ETCD_NAME, ETCD_DATA_DIR, ETCD_LISTEN_PEER_URLS, ETCD_LISTEN_CLIENT_URLS, ETCD_INITIAL_ADVERTISE_PEER_URLS, ETCD_ADVERTISE_CLIENT_URLS, ETCD_INITIAL_CLUSTER, ETCD_INITIAL_CLUSTER_STATE, ETCD_INITIAL_CLUSTER_TOKEN, ETCD_CERT_FILE, ETCD_KEY_FILE, ETCD_CLIENT_CERT_AUTH, ETCD_TRUSTED_CA_FILE, ETCD_PEER_*, ETCD_HEARTBEAT_INTERVAL, ETCD_ELECTION_TIMEOUT, ETCD_SNAPSHOT_COUNT, ETCD_MAX_SNAPSHOTS, ETCD_MAX_WALS): all are valid etcd v3.5 configuration variables.
- **Ports** (2379 client, 2380 peer, 6443 Kubernetes API, 10250 kubelet): correct.
- **Snapshot restore command**: uses `etcdutl snapshot restore` with `--name`, `--initial-cluster`, `--initial-cluster-token`, `--initial-advertise-peer-urls`, `--data-dir` — matches the etcd v3.5 recovery documentation.
- **Prometheus metric names** (`etcd_server_has_leader`, `etcd_disk_wal_fsync_duration_seconds_bucket`, `etcd_mvcc_db_total_size_in_bytes`, `etcd_server_proposals_failed_total`): all confirmed.
- **OpenSSL commands** for CA, server, and client certificate generation (genrsa, req -x509, req -new, x509 -req, verify -CAfile) and the SAN / extension configuration are syntactically correct and produce usable certs.
- **systemd unit** uses `Type=notify` (correct for etcd), `EnvironmentFile=`, `LimitNOFILE=65536`, and reasonable hardening directives.
- **Mermaid diagrams**: syntactically valid `graph TB` and `sequenceDiagram` definitions.

## Review Notes
- The backup script uses `etcdctl snapshot status` and `etcdctl snapshot save`. `snapshot save` is the correct online operation and remains in `etcdctl`. `snapshot status` is an offline operation that was moved to `etcdutl` in v3.5 and is deprecated in `etcdctl` but still functional in 3.5.11 — no failure, just a stylistic deprecation worth noting for future versions (likely removed in a later major release).
- The restore script prefixes `etcdutl` with `ETCDCTL_API=3`. The `ETCDCTL_API` env var is read by `etcdctl`, not `etcdutl`; it's silently ignored here. Harmless but unnecessary.
- `--write-kubeconfig-mode=644` makes the kubeconfig world-readable on the K3s server. Convenient for examples but a security tradeoff — appropriate for a tutorial, callers should tighten this in production.
- The "odd numbers avoid split-brain" framing in the conclusion is a common simplification; etcd uses Raft consensus which strictly prevents split-brain via majority quorum. The real reason odd cluster sizes are preferred is fault-tolerance efficiency ((N-1)/2 failures tolerated, so 3 and 4 nodes both tolerate 1 failure). Not technically incorrect for a tutorial-level audience.
- The `EtcdInsufficientMembers` alert (`count(etcd_server_has_leader == 1) < 2`) only fires when quorum is actually lost (since down members don't report metrics at all). Intentional behavior, not an error.
- TLS certificate validity of 2 years for server/client certs and 10 years for the CA is reasonable; the post correctly advises planning rotation.
