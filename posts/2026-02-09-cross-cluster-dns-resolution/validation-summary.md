# Validation Summary: How to Set Up Cross-Cluster DNS Resolution for Multi-Cluster Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DNS for Services and Pods
- CoreDNS forwarding
- ExternalDNS
- Submariner service discovery
- Kubernetes Multi-Cluster Services API
- Istio multi-cluster service discovery and DNS capture

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Customizing DNS Service: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- ExternalDNS flags: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS annotations: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- Submariner architecture and service discovery: https://submariner.io/getting-started/architecture/
- Submariner subctl reference: https://submariner.io/operations/deployment/subctl/
- SIG Multicluster ServiceExport documentation: https://multicluster.sigs.k8s.io/api-types/service-export/
- Istio multicluster installation: https://istio.io/latest/docs/setup/install/multicluster/
- Istio deployment models: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio DNS proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/

## Issues Found
- The CoreDNS forwarding example mixed a discovered kube-dns ClusterIP (`10.96.0.10`) with a different forward target (`10.244.0.5`). Updated the example to forward to the discovered DNS service IP.
- The CoreDNS example used a `coredns-custom` ConfigMap pattern as if it were portable Kubernetes behavior. Updated the instructions to edit the standard `coredns` ConfigMap and add a Corefile server block while preserving the existing `.:53` configuration.
- The CoreDNS example forwarded `cluster1.local` without stating that the remote cluster must actually use that cluster domain. Added a caveat that the forwarded suffix must match the remote cluster domain, or DNS rewriting is required.
- The ExternalDNS deployment pinned the old `v0.14.0` image. Updated it to `v0.20.0`, matching current ExternalDNS documentation examples.
- The Istio section described built-in cross-cluster DNS resolution too broadly. Clarified that Kubernetes DNS still needs a local Service, ServiceEntry with DNS capture, or another DNS integration for client-side name resolution.
- The Istio section called the sample a shared control plane while the snippet matched a multi-primary shared mesh configuration. Updated the wording.
- The Istio ServiceEntry used the older `networking.istio.io/v1beta1` API and an endpoint address under the local Kubernetes cluster domain. Updated the API to `networking.istio.io/v1`, added a ServiceEntry address for DNS capture, and changed the endpoint to a routable remote DNS name.

## Review Notes
The post is technically relevant and salvageable. The examples are still intentionally simplified; production deployments need provider-specific RBAC, cloud credentials, network routing, firewall rules, and failure-mode testing beyond what this short guide covers.
