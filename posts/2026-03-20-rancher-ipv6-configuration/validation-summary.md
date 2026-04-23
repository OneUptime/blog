# Validation Summary: How to Configure Rancher with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- K3s
- Kubernetes dual-stack networking
- Calico
- Docker
- `kubectl`

## Sources Consulted
- Rancher: IPv4/IPv6 Dual-stack https://ranchermanager.docs.rancher.com/reference-guides/dual-stack
- Rancher: RKE2 Cluster Configuration Reference https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher: Launching Kubernetes on Existing Custom Nodes https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes
- Rancher: Installing Rancher on a Single Node Using Docker https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- RKE2: Network Options https://docs.rke2.io/networking/basic_network_options
- RKE2: Server Configuration Reference https://docs.rke2.io/reference/server_config
- K3s: Basic Network Options https://docs.k3s.io/networking/basic-network-options
- Calico: Configure dual stack or IPv6 only https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico: IP pool reference https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes: IPv4/IPv6 dual-stack https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes: `kubectl wait` https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes: `kubectl port-forward` https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes: kubectl reference docs https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/
- Docker: Port publishing and mapping https://docs.docker.com/engine/network/port-publishing/
- Docker: Use IPv6 networking https://docs.docker.com/engine/daemon/ipv6/

## Issues Found
- The post used invalid IPv6 literals such as `fd00:pod::/48`, `fd00:svc::/108`, and `2001:db8::rancher-host`. I replaced them with valid documentation-safe examples.
- The Rancher RKE2 YAML example used an invalid object shape (`kind: RKE2Config`) and implied the wrong placement for settings. I changed it to the documented Rancher provisioning object shape: `apiVersion: provisioning.cattle.io/v1`, `kind: Cluster`, with settings under `spec.rkeConfig.machineGlobalConfig`.
- The Rancher UI instructions incorrectly told readers to add `--service-cluster-ip-range` through Additional API Server Args. I replaced that with the documented Rancher networking fields: Cluster CIDR, Service CIDR, and Stack Preference set to `dual`.
- The manual RKE2 config used YAML lists for `cluster-cidr` and `service-cidr`, while the official dual-stack examples use comma-separated CIDR strings. I updated the config accordingly and removed the unsupported claim that `bind-address: "::"` is the way to enable dual-stack binding.
- The Calico section incorrectly instructed readers to create an IPv6 `IPPool` after cluster creation. In RKE2 dual-stack mode, Calico automatically detects dual-stack and creates both pools, so I changed this section to verification-only.
- The verification section used a broken service test: `kubectl create service clusterip` creates a single-stack Service by default and the example had no selector-backed verification path. It also tried to ping an arbitrary IPv6 service address. I replaced this with a documented dual-stack Service example using `ipFamilyPolicy: PreferDualStack` and pod/service inspection commands that actually validate dual-stack behavior.
- The production Rancher ingress example was misleading: it showed a hand-written Ingress using backend port `443` and no TLS configuration, which does not reflect the standard Rancher Helm-based installation flow. I replaced it with accurate guidance about Rancher’s Helm-managed ingress and IPv6-capable load balancer / ingress requirements.
- The Docker section implied dual-stack reachability without qualification. I clarified that Rancher-in-Docker is for development/testing only and that IPv6 reachability depends on Docker IPv6 support on Linux hosts.
- The closing paragraph implied Rancher IPv6 support is tied only to Calico or Flannel. I corrected it to reflect that Rancher’s IPv6 support is delivered through RKE2 and K3s with a dual-stack-capable CNI, without excluding other supported options.

## Review Notes
- No remaining technical inaccuracies were found after the fixes.
- Kubernetes Services in dual-stack clusters still default to `SingleStack` unless `ipFamilyPolicy` is set to `PreferDualStack` or `RequireDualStack`; this was the most important behavioral caveat in the original verification steps.
- Rancher’s Docker installation method remains development/testing only and is not a production deployment path.
- `kubectl` was not installed in the review workspace, so CLI syntax was checked against the official generated Kubernetes command reference instead of local `--help` output.
