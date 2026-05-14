# Validation Summary: How to Manage Network Policies with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Flux CD Kustomization
- Flux notification-controller Alert
- Kustomize overlays
- Calico GlobalNetworkPolicy and NetworkPolicy
- kubectl and Flux CLI commands

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1/ and https://fluxcd.io/flux/components/notification/api/v1beta3/
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HTTP methods and paths policy documentation: https://docs.tigera.io/calico/latest/network-policy/istio/http-methods

## Issues Found
- The repository structure used `dns-egress.yaml` and nested `namespaces/production` paths, while later examples used `allow-dns.yaml` and `infrastructure/network-policies/production`. Updated the structure and file comments to use the same layout throughout.
- The Calico `GlobalNetworkPolicy` namespace selector used Kubernetes namespace label keys. Updated the selector examples to use Calico's documented `projectcalico.org/name` namespace label and `all()` selector syntax.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1`, but current Flux Alert and Provider examples use `notification.toolkit.fluxcd.io/v1beta3`; the v1 notification API currently covers Receiver. Updated the Alert apiVersion to `v1beta3`.
- The Alert example used `.spec.summary`, which Flux documents as deprecated. Updated it to `.spec.eventMetadata.summary`.
- The unauthorized database connectivity test used `wget` against PostgreSQL port 5432 with an HTTP URL, which can fail because PostgreSQL is not HTTP even when TCP connectivity is allowed. Replaced it with a TCP connectivity check using `nc -zvw5`.

## Review Notes
- The Kubernetes NetworkPolicy examples use valid `networking.k8s.io/v1` fields and selector semantics.
- The Calico HTTP rule is valid only when Calico application layer policy is enabled for Istio-enabled workloads, which the post already frames as an advanced Calico policy area but could call out more explicitly in a future revision.
