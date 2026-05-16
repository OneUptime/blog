# Validation Summary: How to Set Up Network Policies with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes NetworkPolicy
- Cilium
- CiliumNetworkPolicy
- Hubble
- Helm
- kubectl
- CNI plugins

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Cilium Helm installation documentation for Talos Linux: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium policy enforcement modes documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Kubernetes constructs in policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/latest/observability/hubble/setup/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching

## Issues Found
- The Cilium Helm install command was incomplete for a current Talos Linux installation with kube-proxy replacement. I added the current stable chart version, Kubernetes host-scope IPAM, Talos-specific security capability overrides, cgroup settings, KubePrism API server settings, and `bpf.hostLegacyRouting=true` for Talos host DNS compatibility.
- The Cilium status verification command used the older in-agent `cilium status` form and claimed to verify policy enforcement mode. I changed it to `cilium-dbg status` and adjusted the surrounding text to verify Cilium health rather than policy enforcement mode.
- The CiliumNetworkPolicy L7 example selected `app: frontend` without selecting the frontend namespace, even though the post describes frontend and API pods as living in separate namespaces. I added the Cilium namespace label `k8s:io.kubernetes.pod.namespace: frontend` to make the example match the described topology.
- The Hubble CLI installation commands used the old `master` stable.txt path, did not account for arm64 Linux, did not download or verify the checksum, and only extracted the tarball locally. I updated the commands to use the current official `main` stable.txt path, architecture selection, checksum verification, and installation into `/usr/local/bin`.

## Review Notes
- The Kubernetes NetworkPolicy examples use valid `networking.k8s.io/v1` syntax, and the namespace selector examples correctly depend on explicit namespace labels.
- The egress DNS rule allows TCP and UDP port 53 to any destination. That is syntactically valid, but future hardening could restrict it to the cluster DNS pods or service IP.
- The post lists Weave Net as supporting basic NetworkPolicy. That claim is historically accurate, but Weave Net is less commonly recommended for new clusters than Cilium or Calico.
