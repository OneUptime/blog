# Validation Summary: How to Set Up Istio Gateway with cert-manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- cert-manager
- Kubernetes
- TLS certificates
- ACME HTTP-01 and DNS-01 challenges
- Let's Encrypt
- Helm

## Sources Consulted
- cert-manager installation with kubectl: https://cert-manager.io/docs/installation/kubectl/
- cert-manager installation with Helm: https://cert-manager.io/docs/installation/helm/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager ACME configuration: https://cert-manager.io/docs/configuration/acme/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager DNS-01 and Cloudflare API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager annotations reference: https://cert-manager.io/docs/reference/annotations/
- cert-manager FAQ for manual renewal: https://cert-manager.io/docs/faq/
- Istio cert-manager integration: https://istio.io/latest/docs/ops/integrations/certmanager/
- Istio secure gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/

## Issues Found
- The cert-manager static manifest pinned `v1.14.4`, which is no longer a supported release as of the review date. Updated the manifest URL to the current documented `v1.20.2` release.
- The Helm install example used the legacy Jetstack repository without a version pin. Updated it to the current official OCI chart example with `--version v1.20.2` and `--set crds.enabled=true`.
- The HTTP-01 solver used `ingress.class`. Current cert-manager documentation recommends `ingress.ingressClassName` for most ingress controllers, with `class` only recommended for ingress-gce. Updated the snippet to use `ingressClassName: istio`.
- The post stated that the Certificate must be in `istio-system`. Istio documentation requires it to be in the same namespace as the ingress gateway deployment, which is commonly but not always `istio-system`. Updated the wording accordingly.
- The monitoring section described Certificate states as `Issuing -> Challenge -> Valid`, which conflates Certificate conditions with ACME Order and Challenge resources. Updated the explanation to describe related Order and Challenge resources and the Certificate READY condition.
- The troubleshooting section suggested `cert-manager.io/renew="true"` as a renewal trigger. That annotation is not listed in the current cert-manager annotation reference. Replaced it with the documented `kubectl cert-manager renew` command.

## Review Notes
- The examples assume the Istio ingress gateway is in `istio-system`. Clusters installed with different Istio profiles or Helm layouts may use a different gateway namespace, so commands using `-n istio-system` should be adapted accordingly.
- The Cloudflare DNS-01 example is structurally valid, but a real deployment also needs a Kubernetes Secret containing the referenced API token.
