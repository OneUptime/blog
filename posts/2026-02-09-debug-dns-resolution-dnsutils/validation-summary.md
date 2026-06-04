# Validation Summary: How to Debug DNS Resolution Issues in Kubernetes Using dnsutils and nslookup

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes DNS
- CoreDNS
- kubectl
- dnsutils / nslookup
- dig
- NetworkPolicy
- EndpointSlice

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes Services and EndpointSlice guidance: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- CoreDNS kubernetes plugin: https://coredns.io/plugins/kubernetes/
- CoreDNS cache plugin: https://coredns.io/plugins/cache/
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- Linux resolv.conf manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The post treated `10.96.0.10` as the expected CoreDNS service IP throughout. That value is cluster-dependent, so examples were changed to discover the cluster DNS service IP or use documentation-style example IPs.
- The dnsutils manifest used the older `registry.k8s.io/e2e-test-images/jessie-dnsutils:1.3` image. It was updated to the current Kubernetes DNS debugging example image, `registry.k8s.io/e2e-test-images/agnhost:2.39`, and the shell exec example was changed to a direct `nslookup`.
- The `dig +trace` example used a cluster-local Kubernetes name. `+trace` follows public DNS delegation and is not appropriate for `cluster.local`, so the example was changed to trace an external domain.
- One-shot `kubectl run --rm -it` examples did not set `--restart=Never`. They were updated so diagnostic pods exit and clean up correctly.
- Diagnostic ConfigMap scripts were invoked with `sh` even though they used Bash-specific syntax. The pod commands now invoke `bash`.
- The search path explanation implied the final absolute lookup depends on `api` having enough dots. It was corrected to describe the final absolute `api.` lookup after search-domain attempts.
- The service backend examples used the deprecated Endpoints API. They now use EndpointSlices with the `kubernetes.io/service-name` label.
- The NetworkPolicy example selected the `kube-system` namespace with a non-standard `name` label. It now uses the standard `kubernetes.io/metadata.name` namespace label and narrows the DNS rule to CoreDNS pods.
- The NetworkPolicy comment said it allowed other traffic, but the rule only allowed traffic to pods in the same namespace. The comment was corrected.
- The text claimed cached DNS queries should be under 10ms. This was softened because latency depends on cluster and network conditions.

## Review Notes
The CoreDNS ConfigMap example is syntactically consistent with common Kubernetes CoreDNS deployments, but operators should still merge the `log` plugin into their existing Corefile rather than replacing provider-specific configuration wholesale.
