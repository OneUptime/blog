# Validation Summary: Validate Cilium on k0s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k0s
- Kubernetes
- Cilium
- Helm
- eBPF kube-proxy replacement
- kubectl

## Sources Consulted
- k0s Networking (CNI) documentation: https://docs.k0sproject.io/stable/networking/
- k0s Helm Charts documentation: https://docs.k0sproject.io/stable/helm-charts/
- k0s Configuration Options documentation: https://docs.k0sproject.io/stable/configuration/
- k0s config validate CLI documentation: https://docs.k0sproject.io/head/cli/k0s_config_validate/
- k0s backup CLI documentation: https://docs.k0sproject.io/head/cli/k0s_backup/
- k0s status CLI documentation: https://docs.k0sproject.io/stable/cli/k0s_status/
- k0s logs troubleshooting documentation: https://docs.k0sproject.io/stable/troubleshooting/logs/
- Cilium k0s installation documentation: https://docs.cilium.io/en/stable/installation/k0s/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes Without kube-proxy documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium status CLI documentation: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium connectivity test CLI documentation: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/

## Issues Found
- The introduction said k0s supports Cilium as a CNI option through a built-in extension mechanism and that k0s manages CNI deployment through `HelmExtension`. k0s documents custom CNI support through `spec.network.provider: custom`, while Helm chart deployment is available through `spec.extensions.helm`. Updated the wording to distinguish custom CNI support from optional Helm-managed deployment.
- The guide used `k0s config status` to view cluster configuration. Official k0s docs define this as a dynamic configuration reconciliation status command, not a config display command. Replaced it with `sudo k0s config validate --config /etc/k0s/k0s.yaml` plus direct inspection of `/etc/k0s/k0s.yaml`.
- The Cilium kube-proxy replacement example did not disable kube-proxy in k0s. Added `spec.network.kubeProxy.disabled: true`, matching k0s and Cilium guidance for running without kube-proxy.
- The example used Cilium chart version `1.15.5`, which is outdated for a current validation guide. Updated the example to `1.19.3`, matching the current stable Cilium documentation consulted during review.
- The cleanup step deleted only `cilium-test`, but current `cilium connectivity test` supports `--cleanup` for removing all test artifacts. Replaced the namespace deletion with `cilium connectivity test --cleanup`.
- The best practices recommended `k0s etcd backup`, which is not the current k0s backup command. Replaced it with `sudo k0s backup --save-path=<directory>`.
- The best practices referenced `k0s logs --role=worker`, which is not documented as a current k0s command. Replaced it with the documented systemd log pattern `journalctl -u k0sworker | grep component=kubelet`.

## Review Notes
The remaining kubectl and Cilium CLI validation commands are consistent with official CLI documentation. The Cilium chart version in the example should be refreshed when the post is revisited for future Cilium minor releases.
