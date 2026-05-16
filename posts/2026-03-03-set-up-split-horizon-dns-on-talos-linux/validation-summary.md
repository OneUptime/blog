# Validation Summary: How to Set Up Split-Horizon DNS on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- CoreDNS
- Split-horizon DNS
- Kubernetes ConfigMaps and Deployments
- kubectl
- jq
- cert-manager
- Prometheus Operator Probe resources
- Blackbox exporter

## Sources Consulted
- CoreDNS hosts plugin documentation: https://coredns.io/plugins/hosts/
- CoreDNS file plugin documentation: https://coredns.io/plugins/file/
- CoreDNS health plugin documentation: https://coredns.io/plugins/health/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS reload plugin documentation: https://coredns.io/plugins/reload/
- Kubernetes DNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Prometheus Operator API reference for Probe resources: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus blackbox exporter documentation: https://github.com/prometheus/blackbox_exporter

## Issues Found
- The CoreDNS examples used `health { lazystart }`, but the official CoreDNS health plugin supports `lameduck`, not `lazystart`. Changed both examples to `health { lameduck 5s }`.
- The zone-file example defined an SOA record but no NS record for the zone. Added an `NS` record and an `A` record for `ns1.example.com` so the zone is structurally valid.
- The file-plugin section created a `coredns-zone-data` ConfigMap but did not tell the reader to mount it at the path referenced by the Corefile. Added a sentence instructing the reader to mount it at `/etc/coredns/zones`.
- The automation script could emit invalid hosts entries for headless Services (`clusterIP: None`) or Services missing the hostname annotation. Added `jq` filters to skip those cases.

## Review Notes
- The post is technically relevant and contains implementation details, so it was reviewed as a code/configuration tutorial.
- `kubectl` was not installed in the local environment, so kubectl command validation was performed against Kubernetes documentation rather than local CLI help.
- The CoreDNS `hosts` plugin only serves A, AAAA, and PTR records. The post's hosts-plugin examples use A records, which matches the documented behavior.
- The Prometheus `Probe` example assumes a `dns_internal` blackbox exporter module is defined separately.
