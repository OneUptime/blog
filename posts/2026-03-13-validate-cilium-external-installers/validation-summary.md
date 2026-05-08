# Validation Summary: Validate Cilium Installed via External Installers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- kubectl
- Hubble
- eBPF networking

## Sources Consulted
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium kubeadm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-kubeadm.html
- Cilium Kubernetes ConfigMap options: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Hubble UI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-ui/
- Kubernetes kubeadm cluster creation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Helm `get values` documentation: https://helm.sh/docs/helm/helm_get_values/

## Issues Found
- The introduction described `kubeadm init phases` as a Cilium installation mechanism. Kubernetes kubeadm is network-provider agnostic and Cilium's kubeadm documentation installs Cilium after kubeadm initialization, so this was changed to `kubeadm-based workflows`.
- The `helm get values cilium` example assumed the Helm release is always named `cilium`. A note was added to replace the release name if `helm list` shows a different name.
- The post called the Cilium ConfigMap the source of truth for all runtime configuration. This was softened because it is a primary place to review many runtime options, but external installers and Helm values can also affect the deployed resources.
- The ConfigMap filtering command piped `jsonpath='{.data}'` into `python3 -m json.tool`, but kubectl's JSONPath map output is not JSON. The command now filters the YAML output for the relevant keys.
- The Hubble UI check used `daemonset hubble-ui`, but Hubble UI is deployed as a Deployment in the Cilium documentation. The command now checks `deployment hubble-ui`.
- The routing check used the older `tunnel` ConfigMap key and described `disabled` as a tunnel mode. The current documentation uses `routing-mode` for `tunnel` or `native`, and `tunnel-protocol` for `vxlan` or `geneve`; the commands and comments were updated.
- The individual ConfigMap lookups used JSONPath expressions with hyphenated keys. They were changed to kubectl Go templates with `index` so keys such as `kube-proxy-replacement` and `enable-bpf-masquerade` are read reliably.
- The CNI binary placement command checked only the first Cilium pod even though the text said all nodes. It now loops over all Cilium pods and checks for the documented `cilium-cni` binary.

## Review Notes
The guide is version-agnostic, so the commands were checked against current Cilium stable/latest documentation as of 2026-05-08. Some externally managed clusters may use non-default namespaces, release names, labels, or provider-managed Cilium variants; those cases may require adapting the commands.
