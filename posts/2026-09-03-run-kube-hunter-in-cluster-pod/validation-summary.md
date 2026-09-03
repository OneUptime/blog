# Validation Summary: How to Run kube-hunter as an In-Cluster Pod for an Attacker’s-Eye View

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Jobs and namespaces
- Kubernetes Pod Security Admission and Pod Security Standards
- Kubernetes service accounts and RBAC
- Kubernetes NetworkPolicy and CNI enforcement
- `kubectl`
- kube-hunter 0.6.8 and its in-cluster (`--pod`) scan mode
- Container image hardening and digest pinning

## Sources Consulted
- [kube-hunter deployment documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [Upstream kube-hunter Job manifest](https://github.com/aquasecurity/kube-hunter/blob/main/job.yaml)
- [Upstream kube-hunter Dockerfile](https://github.com/aquasecurity/kube-hunter/blob/main/Dockerfile)
- [kube-hunter command-line parser](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter in-Pod and Kubernetes API discovery implementation](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/hosts.py)
- [kube-hunter Kubernetes client discovery implementation](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/kubernetes_client.py)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes service accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [Kubernetes logging architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [`kubectl wait` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)

## Issues Found
No technical issues found.

## Review Notes
- The image digest is intentionally a placeholder and must be replaced with an approved real SHA-256 digest before applying the manifest.
- The upstream image and manifest are version-specific: at validation time, `job.yaml` uses `aquasec/kube-hunter:0.6.8`, while the Dockerfile has no `USER` instruction. Recheck these facts if upstream changes.
- `ttlSecondsAfterFinished` depends on the Kubernetes TTL-after-finished controller. Clusters that do not enable or support it still permit manual namespace cleanup.
- Pod Security Admission namespace labels only enforce the stated profile when the cluster has the admission controller configured and the namespace is not exempt, as the post already notes.
