# Validation Summary: How to Fix GKE Managed Certificate Stuck in Provisioning State

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Ingress
- GKE ManagedCertificate resources
- Google Cloud external Application Load Balancers
- Google-managed SSL certificates
- DNS A, AAAA, and CAA records
- kubectl
- gcloud CLI

## Sources Consulted
- Google Cloud GKE documentation: Secure traffic for GKE Ingress - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/secure-traffic-management
- Google Cloud GKE documentation: GKE Ingress for Application Load Balancers - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/ingress
- Google Cloud GKE documentation: Troubleshoot GKE Ingress - https://docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/ingress
- Google Cloud Load Balancing documentation: Use Google-managed SSL certificates - https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud Load Balancing documentation: Troubleshoot SSL certificates - https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting
- GoogleCloudPlatform/gke-managed-certs project documentation - https://github.com/GoogleCloudPlatform/gke-managed-certs

## Issues Found
- Corrected the explanation of Google-managed certificate validation. The post described a Let's Encrypt-style HTTP port 80 challenge and special validation path. Google Cloud documents these as Domain Validation certificates that depend on DNS and load balancer visibility, including A/AAAA records pointing only to the load balancer IP addresses.
- Corrected the port guidance. The post said port 80 must be open for validation. Google Cloud documentation says Google-managed certificates must be attached to the load balancer target proxy and the frontend forwarding rule must include port 443. The post now focuses on the HTTPS frontend and explains the GKE caveat around disabling HTTP during initial load balancer programming.
- Added IPv6 DNS checks. Google Cloud documentation explicitly requires both A and AAAA records, when present, to point only to the load balancer IP addresses.
- Updated DNS propagation timing from 48 hours to 72 hours, matching Google Cloud documentation.
- Updated CAA guidance to include both `pki.goog` and `letsencrypt.org` for best reliability, matching Google Cloud's documented recommendation.
- Added the `kubernetes.io/ingress.class: "gce"` annotation to example Ingress manifests because current GKE documentation says GKE Ingress still relies on that annotation for external Application Load Balancers.
- Softened the backend health claim. Backend health is important for a usable Ingress, but certificate provisioning primarily depends on frontend configuration, certificate attachment, and DNS visibility.

## Review Notes
The local environment did not have `kubectl` or `gcloud` installed, so CLI syntax was checked against official Google Cloud and Kubernetes/GKE documentation rather than local `--help` output.
