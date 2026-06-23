# Validation Summary: How to Recover from MetalLB IP Address Conflicts

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MetalLB
- Kubernetes Services
- Kubernetes kubectl
- IPAddressPool custom resources
- ARP, arping, arp-scan, tcpdump, and nmap
- Prometheus alerting
- Linux network neighbor cache management

## Sources Consulted
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- MetalLB advanced IPAddressPool configuration: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- MetalLB troubleshooting documentation: https://metallb.universe.tf/troubleshooting/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- tcpdump local help output from tcpdump 4.99.4

## Issues Found
- The post used the legacy `metallb.universe.tf/address-pool` annotation. Updated it to the current `metallb.io/address-pool` annotation used by MetalLB documentation.
- The post treated `spec.loadBalancerIP` as the primary static IP mechanism. Updated static IP checks and migration examples to prefer MetalLB's `metallb.io/loadBalancerIPs` annotation while still handling the legacy Kubernetes field.
- The internal duplicate recovery example backed up a Service, removed the live static IP request, then reapplied the unchanged backup, which could restore the same conflicting request. Updated the procedure to remove the static request and restart the MetalLB controller if the old assignment is retained.
- The ARP cache flushing examples attempted to exec `ip` and `sh` inside MetalLB speaker containers. Current MetalLB containers are distroless, so this is unreliable. Updated the examples to use `kubectl debug node` with a sysadmin profile and flush the host neighbor cache on nodes running speaker pods.
- The "graceful" migration script created a second Service by editing raw `kubectl get service -o yaml` output with `sed`, which would carry cluster-managed fields and could fail or create invalid Service state. Replaced it with a controlled migration script that updates/removes MetalLB static IP requests directly.
- The force reallocation section claimed a MetalLB restart would reallocate all Services. MetalLB may preserve existing assignments; updated the wording to describe configuration reload and note that Services retaining old assignments may still need deletion and recreation.
- The Prometheus alert examples used an invalid duplicate-IP query based on `metallb_allocator_addresses_in_use_total` and referenced nonexistent `metallb_speaker_announce_failed_total`. Replaced them with documented MetalLB metrics: `metallb_k8s_client_config_stale_bool`, `metallb_allocator_addresses_total`, `metallb_allocator_addresses_in_use_total`, and `metallb_bgp_session_up`.
- The cloud integration example referred to `avoid-buggy-ips` as an annotation. Corrected the text to the actual IPAddressPool field, `avoidBuggyIPs`.

## Review Notes
The post is technically relevant and accurate after the corrections. Some commands remain environment-dependent, especially ARP cache flushing and network scans, because required privileges, images, interfaces, and switch commands vary by cluster and network vendor.
