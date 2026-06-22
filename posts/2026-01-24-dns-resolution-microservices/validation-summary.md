# Validation Summary: How to Fix 'DNS Resolution' Issues in Microservices

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- DNS
- Kubernetes Services, Pod DNS, DNS policy, and DNS config
- CoreDNS
- Kubernetes NetworkPolicy
- Kubernetes EndpointSlice
- kubectl
- Python socket DNS resolution
- Bash scripting
- Istio ServiceEntry and VirtualService

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- CoreDNS cache plugin: https://coredns.io/plugins/cache/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DNS behavior documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Linux resolv.conf manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The DNS resolution diagram incorrectly implied non-local names return `NXDOMAIN` instead of being forwarded upstream. Updated the flow to match Kubernetes `ClusterFirst` behavior: non-cluster-domain queries are forwarded to upstream DNS, while unmatched cluster-domain queries return `NXDOMAIN`.
- The Python DNS error analyzer lowercased input messages but used uppercase regex patterns for `NXDOMAIN`, `SERVFAIL`, and `REFUSED`, so those exact error strings would not match. Changed those patterns to lowercase.
- The troubleshooting guidance and script used the deprecated Kubernetes Endpoints API. Replaced `kubectl get endpoints` usage with EndpointSlice lookups using the `kubernetes.io/service-name` label.
- The `single-request-reopen` comment incorrectly said it reduces query count. Updated the comment to describe its resolver compatibility purpose.
- The DNS cache class claimed to implement background refresh, but no background refresh exists. Updated the description to match the implementation.
- The DNS cache capacity guard could remove zero entries when `max_entries` was less than 10. Changed it to remove at least one entry.
- The DNS health monitor claimed callbacks were for health state changes but invoked them on every check. Added last-health tracking so callbacks fire on initial observation and actual state changes.
- The best-practice note said FQDNs are always faster. Updated it to say FQDNs improve clarity and cross-namespace reliability, avoiding an overbroad performance claim.

## Review Notes
The embedded Python snippets were parsed successfully with Python `ast`, and the Bash snippet passed `bash -n`. The YAML snippets were reviewed against Kubernetes, CoreDNS, and Istio documentation but were not applied to a live cluster.
