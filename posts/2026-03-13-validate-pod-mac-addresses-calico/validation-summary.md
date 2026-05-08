# Validation Summary: How to Validate Pod MAC Addresses with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico CNI
- Kubernetes pods and annotations
- kubectl
- Linux veth interfaces
- Linux neighbor tables

## Sources Consulted
- Calico FAQ, "Why do all cali* interfaces have the MAC address ee:ee:ee:ee:ee:ee?": https://docs.tigera.io/calico/latest/reference/faq
- Calico documentation, "Use a specific MAC address for a pod": https://docs.tigera.io/calico-cloud/networking/configuring/pod-mac-address
- Calico `calicoctl patch` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Project Calico PR #6249, introducing the `cni.projectcalico.org/hwAddr` annotation for Calico v3.24.0: https://github.com/projectcalico/calico/pull/6249
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Linux iproute2 `ip-neighbour(8)` manual page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html

## Issues Found
- The introduction claimed Calico assigns pod MAC addresses using a configurable prefix based on `ee:ee:ee:ee:ee:ee`. Calico documents that `ee:ee:ee:ee:ee:ee` is used on host-side `cali*` interfaces in some setups, and that it is acceptable because Calico uses point-to-point routed interfaces. I updated the explanation to distinguish pod-side `eth0` MACs from host-side `cali*` MACs.
- The prerequisites listed Calico v3.20+, but the fixed pod MAC annotation was introduced for the Calico v3.24.0 release. I changed the prerequisite to Calico v3.24+.
- The "Configure MAC Prefix" section used `deviceRouteProtocol`, which is a Felix routing protocol setting and does not configure MAC prefixes. I replaced it with the supported `cni.projectcalico.org/hwAddr` pod annotation.
- The duplicate MAC command included the `kubectl get pods` header row and used less portable parsing. I changed it to use `--no-headers`, filter running pods, quote variables, and extract `link/ether` from `ip -o link show eth0`.
- The MAC conflict check used the legacy `arp` command. I updated it to use `ip neigh show`, which is the modern iproute2 neighbor table interface.
- The architecture diagram showed pod `eth0` as `ee:ee:ee:xx:xx:xx` and represented the host ARP table as the primary mapping. I updated it to show the pod-side MAC separately from the host-side `cali*` fixed MAC and Calico's routed/neighbor-table behavior.
- The conclusion claimed deterministic pod MAC assignment based on interface identifiers. I replaced it with the documented behavior: repeated `ee:ee:ee:ee:ee:ee` on host-side `cali*` interfaces is expected, and specific pod-side MACs should be requested with the Calico annotation.

## Review Notes
- The `kubectl exec` examples assume the target container image includes the `ip` command. BusyBox includes an `ip` applet, but minimal application images may not.
- For multi-container pods, `kubectl exec` will use the default container annotation or the first container unless `-c` is provided.
