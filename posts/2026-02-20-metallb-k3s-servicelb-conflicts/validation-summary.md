# Validation Summary: How to Install MetalLB on K3s and Fix ServiceLB Conflicts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services of type LoadBalancer
- K3s ServiceLB / Klipper Load Balancer
- MetalLB
- MetalLB Layer 2 mode
- Helm
- kubectl
- YAML custom resources

## Sources Consulted
- K3s Networking Services documentation: https://docs.k3s.io/networking/networking-services
- K3s Configuration Options documentation: https://docs.k3s.io/installation/configuration
- K3s server CLI documentation: https://docs.k3s.io/cli/server
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration documentation: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB release notes: https://metallb.io/release-notes/

## Issues Found
- The ServiceLB description said ServiceLB simply runs as a DaemonSet and spins up a pod on each node. K3s creates a DaemonSet per LoadBalancer service and schedules pods only on nodes where the relevant hostPort is available. Updated the wording to match K3s documentation.
- The MetalLB manifest command used `v0.14.9`. Current MetalLB documentation shows `v0.16.0` for the native manifest. Updated the command to use `v0.16.0`.
- The service pool annotation used the deprecated `metallb.universe.tf/address-pool` prefix. MetalLB release notes and documentation recommend `metallb.io/address-pool`. Updated the annotation.
- The troubleshooting section said services stuck in `Pending` usually mean speaker pods cannot announce the IP. MetalLB documentation distinguishes allocation from advertisement: pending allocation issues are controller-side, while speaker issues apply once an IP is assigned but not reachable. Updated the troubleshooting text and added a controller log command.

## Review Notes
- The post's L2 `IPAddressPool` and `L2Advertisement` examples use the current `metallb.io/v1beta1` APIs and are technically valid.
- The K3s `--disable servicelb` examples and `/etc/rancher/k3s/config.yaml` configuration are consistent with current K3s documentation. In multi-server clusters, K3s requires this critical flag to be configured consistently on all servers.
