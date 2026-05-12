# Validation Summary: Secure Calico etcdv3 Paths

## Status
validated

## Post Type
Guide / Security hardening tutorial

## Technologies Covered
- Calico (etcdv3 datastore mode)
- etcd v3.x (RBAC, TLS, logging, gRPC metrics)
- Kubernetes (kube-apiserver EncryptionConfiguration)
- Prometheus (alerting rules)
- Calico GlobalNetworkPolicy

## Sources Consulted
- Calico etcdv3 key paths reference: https://github.com/projectcalico/calico/blob/release-legacy/v3.4/reference/advanced/etcd-rbac/calico-etcdv3-paths.md
- etcd issue #10662 (audit logging): https://github.com/etcd-io/etcd/issues/10662
- etcd Monitoring docs: https://etcd.io/docs/v3.1/op-guide/monitoring/
- go-grpc-prometheus metrics: https://github.com/grpc-ecosystem/go-grpc-prometheus
- Kubernetes — Encrypting Confidential Data at Rest: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- kube-apiserver config (v1): https://kubernetes.io/docs/reference/config-api/apiserver-config.v1/
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found

1. **Incorrect Calico etcdv3 paths** — The original RBAC table used legacy/incorrect paths like `/calico/v1/policy/`, `/calico/v1/host/`, `/calico/v1/ipam/`, and `/calico/v1/config/`. In current Calico v3.x, IPAM lives under `/calico/ipam/v2/` and all v3 resources (policies, host endpoints, FelixConfiguration, etc.) live under `/calico/resources/v3/projectcalico.org/`. Updated the table, the `etcdctl` verification command, and the mermaid diagram path to use the correct prefixes.

2. **`--audit-log-path` is not an etcd flag** — The "Security Layer 4" code block presented `--audit-log-path=/var/log/etcd/audit.log` as "etcd audit configuration", but this flag belongs to kube-apiserver. etcd has no native audit log feature (tracked in etcd-io/etcd#10662). Replaced the snippet with a note about the lack of native audit logging and an example using etcd's actual logging flags (`--logger=zap`, `--log-outputs`, `--log-level`). The Prometheus alert based on `grpc_server_handled_total{grpc_code="PermissionDenied"}` is technically valid and was kept.

## Review Notes
- The Security Layer 2 example shows kube-apiserver encryption-at-rest for `secrets`. When Calico uses its own etcd directly (etcdv3 datastore mode), kube-apiserver encryption does not protect Calico data — disk-level encryption (e.g., LUKS) or operating-the-etcd-data-dir-on-encrypted-storage is the practical option. The post already calls out "This is a kube-apiserver flag, not an etcd flag", so the distinction is acknowledged; no edit made.
- `aescbc` is still a supported provider in `apiserver.config.k8s.io/v1`, but Kubernetes documentation now recommends `aesgcm` or KMS v2 for new deployments due to the lack of integrity protection in CBC. Worth modernizing the example in the future but not technically wrong.
- The GlobalNetworkPolicy in Security Layer 5 is structurally valid. The Allow rule precedes the Deny rule (correct given Calico's per-rule order within a policy), and the Deny without source restriction will catch non-control-plane sources for ports 2379/2380.
