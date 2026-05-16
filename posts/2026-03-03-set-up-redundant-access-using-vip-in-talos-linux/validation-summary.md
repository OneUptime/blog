# Validation Summary: How to Set Up Redundant Access Using VIP in Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Talos Layer 2 VIP
- KubePrism
- Kubernetes API server access
- Kubernetes kubeconfig
- kubectl
- DNS round-robin
- High availability networking

## Sources Consulted
- Talos Linux Virtual (shared) IP documentation: https://docs.siderolabs.com/talos/v1.13/networking/advanced/vip
- Talos Linux Layer2VIPConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/layer2vipconfig
- Talos Linux LinkConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/linkconfig
- Talos Linux Static Addressing documentation: https://docs.siderolabs.com/talos/v1.13/networking/configuration/static
- Talos Linux KubePrism documentation: https://docs.siderolabs.com/kubernetes-guides/advanced-guides/kubeprism
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post used the older `machine.network.interfaces[].vip.ip` example shape for VIP configuration. Updated VIP examples to use current Talos `Layer2VIPConfig` documents and `LinkConfig` for static addressing.
- The post stated VIP failover takes 3-12 seconds. Talos documentation says graceful shutdown reassigns almost instantly, while unexpected failure can take up to a minute. Updated the limitation and failover test expectation.
- The post implied normal pods can reach KubePrism at `127.0.0.1:7445`. KubePrism is bound to node localhost, so a regular pod's loopback is not the node loopback. Updated the explanation and changed the test command to use a host-networked pod.
- The post said DNS round-robin handles VIP subnet failure. With the example DNS records pointing at addresses on the same subnet, that is not true unless the backup path uses another network or an external load balancer. Updated the access priority and subnet failure test expectation.
- The post did not mention Kubernetes API certificate SAN requirements for DNS, VIP, and direct-node endpoints. Added a short note to include those names and IPs in API server SANs.

## Review Notes
The monitoring YAML is illustrative rather than a schema for a named monitoring product, so it was reviewed as pseudocode. DNS round-robin remains a basic backup path; health-checked DNS or an external load balancer is more reliable for production failover.
