# Validation Summary: How to Secure K3s Cluster

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- K3s
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes Secret encryption at rest
- Kubernetes Pod Security Standards
- Calico
- kube-bench
- External Secrets Operator
- OPA Gatekeeper
- Linux sysctl, iptables, and OpenSSH configuration

## Sources Consulted
- K3s CIS Hardening Guide: https://docs.k3s.io/security/hardening-guide
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s secrets-encrypt CLI reference: https://docs.k3s.io/cli/secrets-encrypt
- K3s Secrets Encryption documentation: https://docs.k3s.io/security/secrets-encryption
- K3s Cluster Datastore documentation: https://docs.k3s.io/datastore
- K3s Networking Services documentation: https://docs.k3s.io/networking/networking-services
- K3s Basic Network Options documentation: https://docs.k3s.io/networking/basic-network-options
- Calico K3s installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/k3s/multi-node-install
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes EncryptionConfiguration documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- kube-bench running documentation: https://github.com/aquasecurity/kube-bench/blob/main/docs/running.md
- External Secrets Operator templating documentation: https://external-secrets.io/latest/guides/templating/

## Issues Found
- The architecture diagram and secret encryption section implied K3s always uses embedded etcd. Updated the diagram to use a generic datastore and clarified that single-server K3s uses SQLite by default, while HA clusters can use embedded etcd or an external datastore.
- The NetworkPolicy section incorrectly stated that default K3s/Flannel does not support NetworkPolicies. Updated it to explain that K3s includes an embedded NetworkPolicy controller by default, and that Calico replacement should disable the built-in controller.
- The custom encryption snippet used a K3s-specific YAML path and recommended AES-GCM for performance. Updated the comments to reflect K3s' generated `encryption-config.json` and warn that AES-GCM requires careful key rotation.
- The secrets encryption rotation commands used the legacy `prepare`, `rotate`, and `reencrypt` sequence. Updated the example to the current `k3s secrets-encrypt rotate-keys` workflow.
- The kube-bench K3s job did not explicitly select the K3s benchmark. Updated the command to use `--benchmark k3s-cis-1.7`.
- The Kubelet security configuration snippet was invalid YAML because `protect-kernel-defaults` interrupted the `kubelet-arg` list. Moved `protect-kernel-defaults` before `kubelet-arg`.

## Review Notes
The examples are broadly correct after fixes, but several snippets remain environment-dependent. Production users still need to adapt audit policy paths, firewall rules, image registry policies, external secret provider configuration, and monitoring manifests to their specific K3s version and cluster topology.
