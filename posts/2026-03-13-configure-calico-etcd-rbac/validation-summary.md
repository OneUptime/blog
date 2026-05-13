# Validation Summary: Configure Calico etcd RBAC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- etcd v3
- etcd RBAC
- etcdctl
- Kubernetes Secrets
- TLS client authentication

## Sources Consulted
- Calico documentation: Setting up etcd certificates for RBAC - https://docs.tigera.io/calico/latest/reference/etcd-rbac/overview
- Calico documentation: Creating users and roles - https://docs.tigera.io/calico/latest/reference/etcd-rbac/users-and-roles
- Calico documentation: Segmenting etcd on Kubernetes (basic) - https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes
- Calico documentation: Segmenting etcd on Kubernetes (advanced) - https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes-advanced
- Calico documentation: Calico key and path prefixes - https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- etcd documentation: Role-based access control - https://etcd.io/docs/v3.3/op-guide/authentication/
- Kubernetes documentation: kubectl create secret generic - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The post used outdated Calico etcd paths such as `/calico/v1/host/`, `/calico/v1/policy/`, `/calico/v1/config/`, and `/calico/v1/ipam/`. Updated the role examples to use current Calico paths such as `/calico/felix/v1/`, `/calico/felix/v2/`, `/calico/ipam/v2/`, and `/calico/resources/v3/projectcalico.org/...`.
- The Felix role did not match the current Calico documentation for hosted Calico components. Replaced it with a `calico-node` role covering Felix running inside calico/node.
- The CNI plugin role used incorrect and outdated paths. Replaced the permissions with the current CNI plugin prefixes for IPAM, workload endpoints, IP pools, cluster information, and nodes.
- The diagram referenced a Calico API server role, but the official Calico etcd RBAC segmentation guidance focuses on calico/node, CNI plugin, calico/kube-controllers, and calicoctl. Updated the diagram and role text accordingly.
- The post mentioned `delete` as a separate etcd RBAC verb. etcd grants `read`, `write`, or `readwrite` permissions; delete operations are covered by write permissions. Updated the wording.
- The prerequisites said RBAC was already enabled even though the first step enables authentication. Updated the prerequisite to require the root user and root role before enabling authentication.
- The Kubernetes Secret command base64-encoded certificate files and passed them through `--from-literal`, which would store the base64 text as the secret value. Replaced it with `--from-file` so `kubectl` packages the file contents correctly.

## Review Notes
- Calico documents that etcd path prefixes may change in future releases, so deployments should verify these paths against the Calico version they run.
- Calico notes that calico/kube-controllers performs periodic etcd compaction by default; tightly scoped RBAC may require etcd auto-compaction and disabling the kube-controllers compaction period.
- Commands were verified against official documentation for syntax and semantics, but were not executed against a live etcd or Kubernetes cluster.
