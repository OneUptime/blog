# Validation Summary: How to Deploy Cloud Armor Security Policies with Flux on GKE

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud Armor
- GKE Ingress
- BackendConfig CRD
- Kubernetes Service and Ingress manifests
- Flux CD Kustomization
- Google Cloud CLI (`gcloud`)
- Cloud Logging

## Sources Consulted
- Google Cloud Armor: Configure security policies: https://cloud.google.com/armor/docs/configure-security-policies
- Google Cloud Armor: Set up preconfigured WAF rules: https://cloud.google.com/armor/docs/configure-waf
- Google Cloud Armor: Preconfigured WAF rules overview: https://cloud.google.com/armor/docs/waf-rules
- Google Cloud Armor: Use request logging: https://cloud.google.com/armor/docs/request-logging
- Google Cloud SDK: `gcloud compute security-policies create`: https://cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- Google Cloud SDK: `gcloud compute security-policies rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- GKE Ingress configuration and BackendConfig documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- GKE Ingress for Application Load Balancers: https://cloud.google.com/kubernetes-engine/docs/concepts/ingress
- GKE secure traffic with Google-managed certificates: https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The preconfigured WAF rule example used `evaluatePreconfiguredExpr('xss-stable')`. Current Cloud Armor documentation uses `evaluatePreconfiguredWaf()` for preconfigured WAF rules. Updated the example to `evaluatePreconfiguredWaf('xss-v33-stable', {'sensitivity': 2})`, matching the current CRS 3.3 rule examples.
- The validation command used `curl --interface 198.51.100.1`, which only binds curl to a local interface or local address and does not spoof a public client IP. Reworded the example to run curl from a client whose public IP is actually in the blocked range.
- The Cloud Armor log viewing comment did not mention that request logging must be enabled for complete Cloud Armor request logs. Added a short caveat.
- The best practice for preview mode used `--action preview-deny-403`, which is not the documented Cloud Armor CLI syntax. Updated it to use the `--preview` flag with the intended `--action`.

## Review Notes
GKE Ingress is currently documented by Google as being in maintenance mode, with Gateway API recommended for new functionality. The post remains technically valid for GKE Ingress use cases, and the `kubernetes.io/ingress.class` annotation is still required by GKE Ingress despite the general Kubernetes deprecation warning.
