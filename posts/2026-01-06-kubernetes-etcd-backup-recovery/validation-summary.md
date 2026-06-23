# Validation Summary: How to Set Up etcd Backup and Recovery in Kubernetes

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Kubernetes (kubeadm-style self-managed control plane, static pod manifests)
- etcd / etcdctl (snapshot save, status, restore; defrag; compact; endpoint health/status; member list)
- Kubernetes CronJob / Job (batch/v1)
- AWS CLI / Amazon S3 (backup offload)
- Prometheus / kube-state-metrics (PrometheusRule, monitoring.coreos.com/v1)
- Velero (referenced for PV backup)

## Sources Consulted
- etcd v3.5.21 GitHub release page — confirms the release exists and the download URL pattern (https://github.com/etcd-io/etcd/releases/tag/v3.5.21)
- Kubernetes etcd image build docs / Makefile — confirms the `registry.k8s.io/etcd:<version>-<revision>` tag format, e.g. `3.5.21-0` (https://github.com/kubernetes/kubernetes/blob/master/cluster/images/etcd/Makefile, https://pkg.go.dev/k8s.io/kubernetes/cluster/images/etcd)
- Kubernetes official docs: "Operating etcd clusters for Kubernetes" — backup/restore procedure, endpoint flags, restore semantics (https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- etcd official docs: disaster recovery / snapshot restore (https://etcd.io/docs/v3.5/op-guide/recovery/)
- kube-state-metrics job metrics (`kube_job_status_failed`, `kube_job_status_completion_time`)

## Issues Found
No technical issues found.

All version-specific details are accurate and internally consistent:
- etcd `v3.5.21` is a valid published release, and `registry.k8s.io/etcd:3.5.21-0` is a correctly formed image tag (`<etcd-version>-<revision>`).
- The etcdctl backup, restore, health, defrag, and compaction commands use correct subcommands and flags (`--endpoints`, `--cacert`, `--cert`, `--key`, `--data-dir`, `--name`, `--initial-cluster`, `--initial-advertise-peer-urls`).
- The `jq` path `.[].Status.header.revision` matches the array-of-objects JSON structure produced by `etcdctl endpoint status --write-out=json`.
- The CronJob manifests use the correct control-plane `nodeSelector`/`toleration` (`node-role.kubernetes.io/control-plane`), `hostNetwork: true` to reach `127.0.0.1:2379`, and valid hostPath cert mounts.
- The single-node and multi-node restore flows correctly move static pod manifests, restore per-member with the full cluster topology, fix ownership, and restart kubelet.
- The Prometheus alert expressions use valid kube-state-metrics series and PromQL.

## Review Notes
- `etcdctl snapshot restore` and `snapshot status` still work in etcd 3.5.x but emit a deprecation notice recommending the standalone `etcdutl` tool. Future revisions could mention `etcdutl snapshot restore` as the forward-looking equivalent for offline operations; `snapshot save` must remain `etcdctl` since it talks to a live cluster.
- In the multi-node restore, adding `--initial-cluster-token <unique-token>` is a recommended hardening step to avoid accidental cross-cluster membership when restoring; the post relies on the default token, which is functional but worth noting.
- The backup CronJob's verification step `etcdctl snapshot status /backup/etcd-*.db` uses a glob that can expand to multiple filenames; `snapshot status` expects a single file. It works for the just-created snapshot in typical cases but could be tightened to reference the specific snapshot filename. Not a correctness error in the documented flow.
- The `amazon/aws-cli` image is unversioned (`:latest` implied); pinning a tag would improve reproducibility, but this is a best-practice nit, not a technical error.
