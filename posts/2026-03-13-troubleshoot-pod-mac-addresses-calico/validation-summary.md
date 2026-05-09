# Validation Summary: How to Troubleshoot Pod MAC Addresses with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Container Network Interface (CNI)
- Linux veth interfaces
- Linux neighbor/ARP tables

## Sources Consulted
- Calico FAQ: https://docs.tigera.io/calico/latest/reference/faq
- Calico Cloud documentation, Use a specific MAC address for a pod: https://docs.tigera.io/calico-cloud/networking/configuring/pod-mac-address
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction incorrectly described Calico pod MAC addresses as using a configurable fixed prefix with interface-specific bytes. Updated it to match Calico documentation: host-side `cali*` interfaces may share `ee:ee:ee:ee:ee:ee` because Calico uses point-to-point routed interfaces, while the container-side pod MAC is isolated in the pod namespace.
- The "Configure MAC Prefix" section used `deviceRouteProtocol`, which controls the protocol label on routes programmed by Felix and does not configure pod MAC prefixes. Replaced it with the supported `cni.projectcalico.org/hwAddr` pod annotation example.
- The duplicate MAC check used `arp -n`. Updated it to use `ip neigh show`, which is the current Linux neighbor table interface and better matches modern troubleshooting practice.
- The pod MAC listing command included the `kubectl get pods` header row and used less precise parsing. Updated it to use `--no-headers`, quote namespace and pod variables, and parse `ip -o link show eth0` output.
- The conclusion incorrectly stated that Calico uses deterministic MAC assignment based on interface identifiers to ensure unique MACs within a node. Updated it to explain the host-side shared MAC behavior and the container-side explicit MAC configuration option.

## Review Notes
The post is valid as a troubleshooting guide after correction. The Calico `hwAddr` annotation must be present when the pod is created; adding it after pod creation has no effect.
