# Validation Summary: How to Troubleshoot Installation Issues with Calico on Minikube

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Minikube
- CNI networking
- kubectl
- calicoctl

## Sources Consulted
- Calico quickstart for Minikube: https://docs.tigera.io/calico/latest/getting-started/kubernetes/minikube
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Minikube start command reference: https://minikube.sigs.k8s.io/docs/commands/start/
- Kubernetes kubectl set env reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Kubernetes kubectl command reference for rollout and describe: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post recommended fixing an existing Calico CIDR conflict by setting `CALICO_IPV4POOL_CIDR` on the running `calico-node` DaemonSet. Calico documents this variable as controlling the IPv4 pool created only when no pool already exists, so this would not reliably change an active IPPool. I changed the section to inspect active IPPools with `calicoctl get ippool -o wide` and explain that the cluster should be recreated or reinstalled with a matching non-overlapping pod CIDR and Calico IPPool.
- The post recommended switching an existing installation from IPIP to VXLAN by setting `CALICO_IPV4POOL_IPIP` and `CALICO_IPV4POOL_VXLAN` on the running DaemonSet. Calico documents those variables as install-time defaults for manifest-created pools. I replaced the command with a `calicoctl patch ippool default-ipv4-ippool` command that updates the active IPPool's `ipipMode` and `vxlanMode`.

## Review Notes
The remaining diagnostic commands are syntactically valid and consistent with Kubernetes, Minikube, and Calico troubleshooting workflows. The guide intentionally stays general and does not pin a Calico or Kubernetes version, so future reviews should re-check Calico's supported Kubernetes versions and Minikube's built-in CNI behavior.
