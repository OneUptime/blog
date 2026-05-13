# Validation Summary: Document Calico etcd RBAC for Operators

## Status
validated

## Post Type
Operations guide

## Technologies Covered
- Calico Open Source
- etcd RBAC
- etcdctl
- Kubernetes Secrets
- kubectl
- cert-manager
- Mermaid diagrams

## Sources Consulted
- Calico Open Source documentation: Setting up etcd certificates for RBAC - https://docs.tigera.io/calico/latest/reference/etcd-rbac/overview
- Calico Open Source documentation: Creating users and roles - https://docs.tigera.io/calico/latest/reference/etcd-rbac/users-and-roles
- Calico Open Source documentation: Calico key and path prefixes - https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths
- Calico Open Source documentation: Segmenting etcd on Kubernetes (basic) - https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes
- etcd v3.6 documentation: Role-based access control - https://etcd.io/docs/v3.6/op-guide/authentication/rbac/
- Kubernetes kubectl reference: create secret generic - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-secret-generic-em-
- Kubernetes kubectl reference: rollout restart - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The human-readable role inventory used outdated or inaccurate example Calico paths such as `/calico/v1/policy/`, `/calico/v1/config/`, and `/calico/v1/ipam/`. Updated the example to use current Calico etcdv3 RBAC prefixes for Felix and CNI, including `/calico/felix/v1/*`, `/calico/felix/v2/*`, `/calico/ipam/v2/*`, and `/calico/resources/v3/projectcalico.org/...`.

## Review Notes
The operational examples are intentionally illustrative. Real Calico etcd RBAC inventories should be generated from the deployed Calico version because the official Calico documentation notes that path prefixes may change over time.
