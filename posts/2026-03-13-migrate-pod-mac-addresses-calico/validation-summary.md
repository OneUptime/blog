# Validation Summary: How to Migrate to Pod MAC Addresses with Calico Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico CNI
- Kubernetes pods and annotations
- Linux veth interfaces
- Linux ARP table inspection
- kubectl

## Sources Consulted
- Calico documentation: Use a specific MAC address for a pod: https://docs.tigera.io/calico/latest/networking/configuring/pod-mac-address
- Calico documentation: Frequently asked questions: https://docs.tigera.io/calico/latest/reference/faq
- Calico documentation: FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post incorrectly stated that Calico uses a configurable pod MAC prefix and showed a `FelixConfiguration` patch using `deviceRouteProtocol`. That Felix field controls the protocol label used on routes programmed by Felix, not pod MAC addresses. I replaced the section with the supported `cni.projectcalico.org/hwAddr` pod annotation workflow.
- The introduction and conclusion described Calico pod MAC assignment as deterministic and prefix-based. I changed this to match Calico documentation: the operating system normally assigns the pod interface MAC, and Calico CNI can set a specific pod MAC with an annotation.
- The pod MAC audit command included the `kubectl get pods` header row and all pod phases. I added `--no-headers` and filtered to running pods so the command is less likely to emit false failures.
- The Mermaid diagram used `ee:ee:ee:xx:xx:xx` for the pod interface, which conflated pod MAC addresses with Calico FAQ guidance about some host-side `cali*` interfaces using `ee:ee:ee:ee:ee:ee`. I changed the pod label to describe a configured or OS-assigned MAC.

## Review Notes
The `grep -oP` command depends on GNU grep, which is typical on Linux nodes but not portable to default macOS/BSD grep. The MAC annotation must be present before pod creation; adding it to an existing pod does not change the running pod's MAC address.
