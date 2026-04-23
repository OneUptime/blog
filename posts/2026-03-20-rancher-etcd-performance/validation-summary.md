# Validation Summary: How to Optimize etcd Performance for Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- etcd
- Kubernetes
- `kubectl`
- `etcdctl`
- Prometheus Operator
- Prometheus
- `fio`
- Bash

## Sources Consulted
- etcd cluster status: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd maintenance guide: https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd tuning guide: https://etcd.io/docs/v3.4/tuning/
- etcd configuration reference: https://etcd.io/docs/v3.6/op-guide/configuration/
- etcd metrics reference: https://etcd.io/docs/v3.6/metrics/
- etcd monitoring guide: https://etcd.io/docs/v3.6/op-guide/monitoring/
- etcd system limits: https://etcd.io/docs/v3.6/dev-guide/limit/
- etcd performance guide: https://etcd.io/docs/v3.7/op-guide/performance/
- etcd v3.6 announcement: https://etcd.io/blog/2025/announcing-etcd-3.6/
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 embedded datastore: https://docs.rke2.io/datastore/embedded
- RKE2 backup and restore: https://docs.rke2.io/datastore/backup_restore
- RKE2 certificate management: https://docs.rke2.io/security/certificates
- RKE2 logging reference: https://docs.rke2.io/reference/logging
- RKE2 server roles: https://docs.rke2.io/install/server_roles
- RKE2 automated upgrades: https://docs.rke2.io/upgrades/automated
- RKE2 release notes v1.32.X: https://docs.rke2.io/release-notes/v1.32.X

## Issues Found
- The etcdctl examples used kubeadm-style certificate paths under `/etc/kubernetes/pki/etcd` and used peer certificates. For RKE2 embedded etcd, I changed these to the documented RKE2 etcd CA/client certificate paths under `/var/lib/rancher/rke2/server/tls/etcd` and used the client certificate pair.
- The “cluster health” and “database size” checks were described as cluster-wide checks but only targeted a single local endpoint. I updated the health and status examples to seed discovery from `https://127.0.0.1:2379` and use `--cluster`.
- The revision extraction example depended on `jq` but `jq` was not listed in prerequisites. I added it.
- The defragmentation example hardcoded `https://etcd-0:2379`, `https://etcd-1:2379`, and `https://etcd-2:2379`, which does not match how RKE2 static etcd pods are typically named or accessed. I replaced it with a `kubectl exec` loop that defragments each etcd pod against its own local `127.0.0.1:2379`.
- The tuning comments around `max-request-bytes` and `snapshot-count` were misleading. I corrected the comments to reflect that larger request sizes can increase latency and that `snapshot-count` is version-sensitive rather than a generic “compaction trigger.”
- The storage benchmark section used `/var/lib/etcd`, which does not match RKE2’s embedded etcd data location, and it stated a strict `<10ms` rule. I updated the path to the RKE2 embedded etcd location and aligned the latency guidance with etcd’s documented disk-latency discussion.
- The CronJob example mounted the wrong certificate path, used the wrong cert/key pair, could be scheduled onto non-server nodes, only defragmented the local member, and pinned an outdated etcd image version (`v3.5.9`, which corresponds to much older RKE2 releases). I updated it to use RKE2 TLS paths, `--cluster`, server-node scheduling/toleration guidance, `concurrencyPolicy: Forbid`, and a release-matched image placeholder instead of an obsolete hardcoded tag.

## Review Notes
- RKE2 version matters here. RKE2 2026 releases span both etcd 3.5 and etcd 3.6, and etcd 3.6 changed the default `snapshot-count`, so the post should avoid implying a single default across all Rancher/RKE2 deployments.
- The PrometheusRule examples are technically valid, but the `release: rancher-monitoring` label and `cattle-monitoring-system` namespace assume Rancher Monitoring is installed with the default naming pattern.
- The CronJob example now correctly avoids an obsolete hardcoded image tag, but the reader still needs to pick the exact `rancher/hardened-etcd` tag that matches the RKE2 release running in their cluster.
