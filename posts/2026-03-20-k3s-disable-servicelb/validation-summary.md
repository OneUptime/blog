# Validation Summary: How to Disable ServiceLB in K3s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- ServiceLB
- MetalLB
- AWS Load Balancer Controller
- Helm
- BGP
- Layer 2 networking

## Sources Consulted
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- MetalLB Installation: https://metallb.io/installation/
- MetalLB Configuration: https://metallb.io/configuration/
- MetalLB Usage: https://metallb.io/usage/
- MetalLB Layer 2 Concepts: https://metallb.io/concepts/layer2/
- MetalLB Issues with K3s: https://metallb.io/configuration/k3s/
- AWS Load Balancer Controller Installation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/
- AWS Load Balancer Controller NLB Services: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/
- AWS Load Balancer Controller Subnet Discovery: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/subnet_discovery/

## Issues Found
- The ServiceLB behavior description said the DaemonSet binds on every node, that the Service IP is one of the node IPs, and that balancing happens at the DaemonSet layer. Updated this to match K3s docs: ServiceLB uses eligible nodes with the requested host port available, publishes node IPs into `status.loadBalancer.ingress`, and forwards traffic to the Service's ClusterIP.
- The existing-cluster disable method appended a second `disable:` key to `config.yaml`, which is not a safe way to modify YAML and can clobber or invalidate configuration. Replaced it with a supported drop-in file under `/etc/rancher/k3s/config.yaml.d/` using `disable+:`, and noted that the change must be applied on every K3s server node.
- The verification section checked for a ServiceLB HelmChart, but K3s documents that embedded `servicelb` does not have a manifest file. Replaced that check with behavior that actually reflects ServiceLB removal before another load balancer is installed.
- The MetalLB install command used an older `v0.14.3` manifest URL. Updated it to the current official installation manifest version shown in MetalLB docs at review time, `v0.15.3`.
- The Layer 2 section claimed it works with any network, which is too broad. Narrowed it to bare-metal Ethernet networks to match MetalLB's Layer 2 documentation.
- The Layer 2 test snippet exposed `deployment my-app` without creating it first. Added a `kubectl create deployment my-app --image=nginx` step so the commands work as written.
- The MetalLB annotation examples used the old `metallb.universe.io/*` keys. Updated them to the current `metallb.io/*` annotation names from the official usage docs.
- The AWS example appended only `- servicelb` to `config.yaml`, which is invalid unless it already sits under a `disable:` key. Replaced it with the same valid K3s drop-in approach used earlier in the post and added the missing AWS controller prerequisites note about IAM permissions and subnet tagging.
- The conclusion referred specifically to ARP announcements for MetalLB in general and again said Layer 2 works on any network. Updated the wording to "network announcements" and limited the Layer 2 claim to bare-metal Ethernet networks.

## Review Notes
The post now matches the current K3s and MetalLB documentation as of 2026-04-29. The MetalLB manifest URL is version-pinned, so it should be rechecked against the official installation docs if the post is revised later. On multi-server K3s clusters, `--disable servicelb` is a critical server configuration and must be set consistently across all server nodes.
