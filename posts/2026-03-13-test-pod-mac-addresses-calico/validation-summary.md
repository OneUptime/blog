# Validation Summary: How to Test Pod MAC Addresses with Calico with Live Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico CNI
- Linux networking
- MAC addresses

## Sources Consulted
- Calico documentation: Use a specific MAC address for a pod - https://docs.tigera.io/calico-cloud/networking/configuring/pod-mac-address
- Calico documentation: Frequently asked questions - https://docs.tigera.io/calico/latest/reference/faq
- Calico documentation: Component architecture - https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The introduction incorrectly described Calico pod interface MAC assignment as a configurable fixed-prefix scheme with interface-specific bytes. Updated it to reflect Calico's documented behavior: host-side `cali*` interfaces may use `ee:ee:ee:ee:ee:ee`, and Calico uses point-to-point routed interfaces where the host-side MAC is not used for forwarding.
- The "Configure MAC Prefix" section used `deviceRouteProtocol`, which configures the Linux route protocol label for routes programmed by Felix and does not configure MAC prefixes. Replaced it with the documented `cni.projectcalico.org/hwAddr` pod annotation for setting a pod's `eth0` MAC address at creation time.
- The pod enumeration command included the `kubectl get pods` header row, which would produce a bogus `NAMESPACE/NAME` entry. Added `--no-headers`.
- The ARP conflict check used legacy `arp -n`. Replaced it with `ip neigh show`, which is the current Linux iproute2 interface for neighbor table inspection.
- The architecture diagram and conclusion implied unique deterministic MAC assignment for host-side Calico workload interfaces. Updated them to distinguish the pod `eth0` MAC from the host-side `cali*` interface MAC.

## Review Notes
The post is technically relevant and now matches the documented Calico behavior. Future improvements could include adding a complete test pod manifest and noting that the `hwAddr` annotation requires Calico CNI and must be set before pod creation.
