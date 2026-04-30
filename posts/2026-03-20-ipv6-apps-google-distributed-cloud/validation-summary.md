# Validation Summary: How to Deploy IPv6 Applications on Google Distributed Cloud

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Distributed Cloud Bare Metal
- Kubernetes
- IPv6
- Dual-stack networking
- `bmctl`
- Kubernetes Services
- Kubernetes NetworkPolicy

## Sources Consulted
- Google Distributed Cloud bare metal dual-stack networking: https://cloud.google.com/kubernetes-engine/distributed-cloud/bare-metal/docs/how-to/dual-stack-networking
- Google Distributed Cloud bundled load balancing with MetalLB: https://cloud.google.com/kubernetes-engine/distributed-cloud/bare-metal/docs/installing/bundled-lb
- Google Distributed Cloud `bmctl` command reference: https://cloud.google.com/kubernetes-engine/distributed-cloud/bare-metal/docs/reference/bmctl
- Google Distributed Cloud health checks: https://cloud.google.com/kubernetes-engine/distributed-cloud/bare-metal/docs/troubleshooting/healthchecks
- Kubernetes dual-stack services and load balancers: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service API behavior: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post said dual-stack could be configured when creating or updating a GDC Bare Metal cluster. Google’s dual-stack documentation says dual-stack must be enabled at cluster creation time and can't be enabled later on an existing cluster. I corrected the text accordingly.
- The cluster configuration placed an IPv6 Pod CIDR directly under `clusterNetwork.pods.cidrBlocks`. For GDC Bare Metal dual-stack clusters, the Cluster manifest keeps only the IPv4 Pod CIDR there, and IPv6 Pod CIDRs are defined through a `ClusterCIDRConfig` resource. I removed the invalid IPv6 Pod CIDR from `clusterNetwork.pods.cidrBlocks` and added a matching `ClusterCIDRConfig` example.
- The bundled load balancer example omitted `loadBalancer.addressPools`, which are required for `LoadBalancer` Services and must include both IPv4 and IPv6 ranges for dual-stack service VIP allocation. I added a dual-stack `addressPools` example and kept `ingressVIP` inside the IPv4 pool as required.
- The `bmctl create cluster` command used an unsupported `--config` flag. The official `bmctl` reference documents `bmctl create cluster -c CLUSTER_NAME`, which reads the config from the workspace path. I fixed the command.
- The IPv6 extraction command filtered `.status.loadBalancer.ingress` on a non-existent `ipFamily` field. Kubernetes exposes a list of ingress IPs, not per-entry `ipFamily` metadata there. I replaced the command with one that lists ingress IPs and selects the IPv6 address by pattern.
- The network policy section described the sample as IPv6-specific, but the manifest actually allows TCP/80 ingress regardless of IP family. I updated the wording and inline comment so the explanation matches the manifest’s real behavior.
- The monitoring snippet used `ping6`. I switched it to `ping -6`, which is the more portable invocation on modern Linux systems.

## Review Notes
- The Step 1 YAML is now accurate for the dual-stack-specific fields, but it remains a partial example rather than a complete, ready-to-apply `bmctl` configuration. A full cluster config still needs the usual generated fields such as workstation key paths, namespace, and node pool definitions.
- The post does not pin a specific GDC release. The corrections were aligned with the currently published Google Distributed Cloud documentation available on April 30, 2026, including the dual-stack networking page last updated on April 23, 2026.
