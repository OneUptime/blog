# Validation Summary: How to Set Up ExternalDNS on GKE to Auto Manage Cloud DNS Records from K8s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Workload Identity Federation for GKE
- Google Cloud IAM service accounts
- Google Cloud DNS
- ExternalDNS
- Kubernetes Services, Ingresses, RBAC, Deployments, and ServiceAccounts
- gcloud CLI and kubectl

## Sources Consulted
- Google Cloud DNS managed zones documentation: https://cloud.google.com/dns/docs/zones
- gcloud `dns managed-zones create` reference: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- GKE Workload Identity Federation concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- GKE Workload Identity Federation setup guide: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- ExternalDNS GKE tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/gke/
- ExternalDNS flags reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS annotations reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS service source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/service/
- ExternalDNS TTL documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/advanced/ttl/
- ExternalDNS v0.21.0 release page: https://github.com/kubernetes-sigs/external-dns/releases/tag/v0.21.0

## Issues Found
- The ExternalDNS image was pinned to `v0.14.0`, which is old. Updated it to `registry.k8s.io/external-dns/external-dns:v0.21.0`, the latest GitHub release checked during validation.
- The RBAC manifest did not grant access to `discovery.k8s.io/endpointslices`, which ExternalDNS requires for current service-source support. Added `get`, `watch`, and `list` permissions for EndpointSlices.
- The prerequisites did not say that Workload Identity Federation for GKE must be enabled on the cluster and node pool running ExternalDNS. Added that requirement so the keyless authentication setup works as described.
- The namespace and service account manifest used two filename comments but only applied one file. Consolidated the example under `external-dns-serviceaccount.yaml` and updated the `kubectl apply` command.
- The `--domain-filter` comment incorrectly described the flag as selecting a single DNS zone. Clarified that it limits DNS names and matching zones under the domain.
- The `--txt-owner-id` comment incorrectly called the value a TXT record prefix. Clarified that it is the stable owner ID used by the TXT registry.

## Review Notes
The use of IAM service account impersonation remains technically valid, though current GKE documentation recommends direct Workload Identity Federation principal bindings when the target Google Cloud API supports them. The tutorial intentionally keeps `roles/dns.admin` at project scope for simplicity; a future hardening pass could narrow this to managed-zone-level permissions.
