# Validation Summary: How to Configure Redis Network Policies in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (standalone and Cluster mode)
- Kubernetes NetworkPolicy API (networking.k8s.io/v1)
- Kubernetes CNI plugins (Calico, Cilium, Weave Net)
- Prometheus / Redis Exporter
- CoreDNS / kube-dns

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes namespace labels documentation (kubernetes.io/metadata.name automatic label): https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#automatic-labelling
- Redis Cluster specification (cluster bus port = port + 10000): https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Exporter default port (9121): https://github.com/oliver006/redis_exporter
- Kubernetes CoreDNS / kube-dns labels: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/

## Issues Found
No technical issues found.

## Review Notes
- The summary section advises "Always label your namespaces to enable namespace selectors in policies." Since all the examples use `kubernetes.io/metadata.name`, which is automatically applied to namespaces since Kubernetes 1.21, manual labeling is not strictly required for the patterns shown. However, the advice is still valid for users who want custom namespace labels for more complex selector scenarios.
- The `--restart=Never` flag in `kubectl run` is deprecated as a flag in newer kubectl versions (it's the default behavior for `kubectl run` creating Pods), but it still works and is not incorrect.
- All YAML manifests are syntactically valid and use the correct `networking.k8s.io/v1` API version.
- The AND semantics of combined `namespaceSelector` + `podSelector` within a single `from` array item are used correctly throughout.
