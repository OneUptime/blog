# Validation Summary: Upgrade Cilium with External Installers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- kubeadm
- kOps
- Kubespray
- Helm
- kubectl
- Ansible

## Sources Consulted
- Cilium Upgrade Guide: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium Quick Installation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium Installation using kubeadm: https://docs.cilium.io/en/stable/installation/k8s-install-kubeadm.html
- Cilium Installation using Kubespray: https://docs.cilium.io/en/stable/installation/k8s-install-kubespray/
- kOps Cilium networking documentation: https://kops.sigs.k8s.io/networking/cilium/
- kOps API documentation for CiliumNetworkingSpec: https://pkg.go.dev/k8s.io/kops/pkg/apis/kops#CiliumNetworkingSpec
- kOps rolling update CLI documentation: https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/
- Kubespray upgrade documentation: https://github.com/kubernetes-sigs/kubespray/blob/master/docs/operations/upgrades.md
- Kubespray Cilium role defaults and tasks: https://github.com/kubernetes-sigs/kubespray
- Kubernetes kubeadm troubleshooting documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/troubleshooting-kubeadm/

## Issues Found
- The Helm upgrade example used `--reuse-values` for a Cilium version upgrade. Cilium's upgrade guide warns not to use `--reuse-values` when upgrading between chart versions because it can omit newly introduced values. Changed the example to use a values file with `-f my-values.yaml`.
- The raw manifest URL for `quick-install.yaml` returned 404 and does not match current Cilium upgrade guidance. Changed the manifest-based path to render the Cilium chart with `helm template` and apply the generated YAML.
- The post used Cilium `1.15.0` in examples. Updated examples to `1.19.3`, the current stable version referenced by the official Cilium docs checked during review.
- The kOps preview command used `kops update cluster <cluster-name> --yes --dry-run`. kOps documentation shows preview mode by running `kops update cluster <cluster-name>` without `--yes`, then applying with `--yes`. Updated the command accordingly.
- The Kubespray example used `cilium_version: "v1.15.0"`. Current Kubespray defaults use `cilium_version` without the leading `v`, with image tags constructed separately. Updated it to `cilium_version: "1.19.3"`.
- The Kubespray example referenced `network_plugin.yml --tags cilium`, but current Kubespray uses `cluster.yml --tags=network` for network plugin component upgrades. Updated the command to use `cluster.yml --tags network`.

## Review Notes
- The post is technically relevant and contains implementation commands, so it was reviewed as a code/technical guide.
- The procedures are version-sensitive. Operators should still check their installer's supported Cilium and Kubernetes version matrix before applying these examples in production.
