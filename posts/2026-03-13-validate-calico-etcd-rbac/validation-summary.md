# Validation Summary: Validate Calico etcd RBAC

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- etcd v3
- etcdctl
- etcd RBAC

## Sources Consulted
- Calico documentation: Calico key and path prefixes, https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths
- Calico documentation: Segmenting etcd on Kubernetes (basic), https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes
- Calico documentation: Segmenting etcd on Kubernetes (advanced), https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes-advanced
- etcd documentation: Role-based access control, https://etcd.io/docs/v3.7/op-guide/authentication/rbac/
- etcd documentation: How to get keys by prefix, https://etcd.io/docs/v3.5/tutorials/how-to-get-key-by-prefix/
- Kubernetes documentation: kubectl logs reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post used older Calico key paths such as `/calico/v1/policy/`, `/calico/v1/config/`, `/calico/v1/host/`, and `/calico/v1/ipam/` while describing etcd v3.x RBAC. Current Calico etcdv3 RBAC documentation lists Felix access under `/calico/felix/v1/`, `/calico/felix/v2/`, and read access to `/calico/resources/v3/projectcalico.org/`, with CNI/IPAM access under `/calico/ipam/v2/`. Updated the example role output, permitted-access tests, denied-access tests, Mermaid diagram, prerequisites, and conclusion to use the documented etcdv3 prefixes.
- The conclusion said Felix writes host data. For current documented standalone Felix etcdv3 permissions, Felix writes Felix-specific paths and reads Calico resources. Updated that wording accordingly.

## Review Notes
- The examples use `etcdctl ...` as an abbreviation after showing the full TLS command once. That is acceptable for a blog guide, but a future improvement would be to define a shell alias or environment variables so readers can run every command directly.
- The Calico documentation notes that the key prefixes can change in the future, so these RBAC validation checks should be reviewed when upgrading Calico.
