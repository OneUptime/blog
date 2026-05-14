# Validation Summary: How to Validate Calico Component Version Compatibility in a Lab Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- kubectl
- kubeadm
- calicoctl
- Kubernetes NetworkPolicy

## Sources Consulted
- Calico documentation: Upgrade Calico on Kubernetes, https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: System requirements for Kubernetes, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: Installation reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: calicoctl node status, https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes documentation: kubectl version, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes documentation: kubectl wait, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes documentation: Upgrading kubeadm clusters, https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes documentation: kubeadm upgrade, https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-upgrade/

## Issues Found
- Replaced `kubectl version --short` with `kubectl version`, because the current generated kubectl reference documents `kubectl version` and `-o yaml|json`, but not `--short`.
- Changed the version-recording command to use `kubectl version -o json` and `jq`, which is consistent with the documented kubectl output formats.
- Clarified the compatibility check wording from a generic "compatibility matrix" to Calico's documented Kubernetes requirements and tested versions.
- Replaced the Calico operator upgrade commands. Patching the `tigera-operator` deployment image directly and patching `Installation.spec.variant` do not represent the documented operator upgrade flow. The post now applies the target version's Calico CRDs and `tigera-operator.yaml` with server-side apply, matching Calico documentation.
- Added `kubectl wait` readiness checks before using test pod IPs and running connectivity tests, so the examples do not race pod startup.
- Replaced the undefined `test-deny-policy.yaml` reference with an inline Kubernetes `NetworkPolicy` manifest and added labels to the test server pod, making the policy test self-contained and valid.
- Deleted the deny policy after each policy test so later connectivity checks can succeed as described.
- Replaced the stale kubeadm example target `v1.28.0` with `<target-version>` and noted that kubelet and kubectl upgrades must also be handled on the nodes after `kubeadm upgrade apply`.
- Adjusted the calicoctl checklist wording from strict version "sync" to keeping calicoctl current, because Calico specifically warns not to use older calicoctl versions after an upgrade.

## Review Notes
The guide assumes an operator-managed Calico installation in the `calico-system` and `tigera-operator` namespaces. Clusters installed from raw manifests, Helm, or older layouts may require namespace and upgrade-command adjustments.
