# Validation Summary: Troubleshoot Calico CNI Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico CNI plugin
- Calico IPAM
- Calico WorkloadEndpoint resources
- Kubernetes
- kubectl
- calicoctl

## Sources Consulted
- Calico Open Source 3.32 Configure the Calico CNI plugins: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico Open Source 3.32 WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico Open Source 3.32 calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Open Source 3.32 calicoctl IPAM overview: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source 3.32 calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source 3.32 calicoctl ipam release: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Enterprise 3.22 calicoctl ipam check: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico Open Source 3.32 troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The node CNI log example piped `kubectl debug` output into `tail`, and the CNI config check used `kubectl exec` against an arbitrary `calico-node` pod. I changed both to use `kubectl debug node/$NODE` so the commands inspect files on the affected node's host filesystem.
- The IPPool selector lookup grepped for `namespaceselector`, but Calico's field is `namespaceSelector`. I corrected the field name.
- The WorkloadEndpoint examples assumed a simple `<pod-name>-<interface>` resource name and grepped for `ipNets`. Calico WorkloadEndpoint names include node/orchestrator details, and the documented field is `ipNetworks`, so the commands now first list WEPs and then inspect the actual resource name.
- The slow pod start section described a generic CNI timeout for API server contact and suggested increasing unspecified `cni_network_config timeout settings`. Current Calico documentation exposes policy startup waiting as `policy_setup_timeout_seconds` in CNI config and `spec.calicoNetwork.linuxPolicySetupTimeoutSeconds` for operator installs, so the commands and comments now reference those settings.

## Review Notes
The examples assume Calico is installed in the `calico-system` namespace, which matches operator-managed installs. Manifest-based installations often use `kube-system`; users may need to adjust the namespace for those clusters. The `calicoctl ipam check` command is documented in Calico Enterprise references and exists in calicoctl implementations, but the current Calico Open Source IPAM overview emphasizes `show`, `release`, and `configure`.
