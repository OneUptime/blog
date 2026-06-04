# Validation Summary: How to Set Up ExternalDNS with Cloud DNS for GKE Kubernetes Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud DNS
- ExternalDNS
- Kubernetes Services and Ingress
- GKE Workload Identity Federation
- Helm
- gcloud CLI

## Sources Consulted
- ExternalDNS GKE tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/gke/
- ExternalDNS flags reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS Helm chart values.yaml: https://github.com/kubernetes-sigs/external-dns/blob/master/charts/external-dns/values.yaml
- ExternalDNS Google provider source: https://github.com/kubernetes-sigs/external-dns/blob/master/provider/google/google.go
- Google Cloud GKE Workload Identity Federation guide: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud DNS managed zones documentation: https://docs.cloud.google.com/dns/docs/zones
- Google Cloud SDK DNS managed zones reference: https://docs.cloud.google.com/sdk/gcloud/reference/dns/managed-zones
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The manual ExternalDNS deployment did not include Kubernetes RBAC permissions. Added a ClusterRole and ClusterRoleBinding to the `externaldns-deployment.yaml` example so ExternalDNS can list and watch Services, Pods, Nodes, EndpointSlices, and Ingresses as required by the official ExternalDNS GKE manifest.
- The Helm example used the deprecated `provider=google` chart value and an unsupported `google.project` value. Updated it to `provider.name=google` and `extraArgs.google-project=PROJECT_ID`, matching the current ExternalDNS Helm chart.
- The "zone ID filters" example did not include a zone ID filter. Replaced `--google-zone-visibility=public` with `--zone-id-filter=example-zone`, which matches the documented ExternalDNS flag and the Google provider's support for matching Cloud DNS managed zone names or numeric IDs.

## Review Notes
- The GKE Ingress example correctly keeps `kubernetes.io/ingress.class: "gce"` because Google Cloud documentation states that GKE Ingress still requires this annotation even though the generic Kubernetes annotation is deprecated.
- The post uses ExternalDNS `v0.14.0` in the manual manifest. That version is older than the current ExternalDNS release, but the flags and APIs used in the post are still valid for the covered setup.
