# Validation Summary: How to Prevent IPAM Block Conflicts in Calico

## Status
validated

## Post Type
Guide / Operational Best Practices

## Technologies Covered
- Calico (calicoctl, IPAM, block affinities, calico-kube-controllers)
- Kubernetes (kubectl, CronJob, drain, node lifecycle)
- Bash scripting
- YAML

## Sources Consulted
- Calico documentation - `calicoctl ipam check`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation - IPAM block affinities and resources: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico documentation - calico-kube-controllers: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Kubernetes documentation - `kubectl drain` flags: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain
- Kubernetes documentation - CronJob `batch/v1`: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Calico release notes for v3.27: https://docs.tigera.io/calico/3.27/release-notes/
- Docker Hub `calico/ctl` image registry

## Issues Found
No technical issues found.

- `calicoctl ipam check` is a valid sub-command and is the canonical way to detect IPAM inconsistencies.
- `kubectl drain --ignore-daemonsets --delete-emptydir-data --timeout=300s` uses valid, current flags.
- `BlockAffinity` is a Calico custom resource with `spec.node` and `spec.cidr` fields; the jsonpath expressions used are correct.
- The `k8s-app=calico-kube-controllers` label selector matches the manifest shipped by Calico.
- `apiVersion: batch/v1` for CronJob is correct (stable since Kubernetes 1.21).
- `calico/ctl:v3.27.0` is a published image tag on Docker Hub.
- Claim that calico-kube-controllers performs automatic IPAM garbage collection is consistent with Calico's documented controller responsibilities.

## Review Notes
- Calico v3.27.0 is pinned in the CronJob image. Consumers should consider bumping to a version that matches their Calico data-plane release to avoid CLI/data version mismatches; later versions (v3.28+/v3.29+) are available.
- The `sleep 30` after node deletion is a heuristic; for large clusters with many allocations, IPAM GC can take longer. The Step 5 manual cleanup loop is a good safety net.
- `calicoctl get blockaffinity` requires `DATASTORE_TYPE=kubernetes` (or appropriate calicoctl config) when running against a KDD-backed cluster; this is the default for typical Calico-on-Kubernetes installs and is not worth calling out as an issue.
- The CronJob assumes the `calico-node` ServiceAccount has sufficient permissions to read IPAM resources; in most standard installs this is true, but operators with hardened RBAC may need a dedicated SA with read-only permissions on Calico CRDs.
