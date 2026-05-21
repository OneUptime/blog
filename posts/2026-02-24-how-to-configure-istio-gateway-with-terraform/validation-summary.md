# Validation Summary: How to Configure Istio Gateway with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService traffic routing
- Terraform Kubernetes provider
- Kubernetes Secrets
- cert-manager Certificate resources
- Kubernetes ingress gateway Services
- istioctl diagnostics

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Ingress Gateway without TLS Termination task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
- Istio Installing Gateways documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Terraform Kubernetes provider `kubernetes_secret` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Terraform Kubernetes provider `kubernetes_manifest` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/

## Issues Found
- The Gateway selectors used `istio = "ingress"`, but Istio's standard gateway examples use the pod label `istio: ingressgateway`. Updated all examples and the explanatory text to use `istio = "ingressgateway"`.
- The Terraform `kubernetes_secret` examples used `filebase64(...)` in the `data` map. The Kubernetes provider's `data` field expects unencoded string values, so this would store base64 text as the secret value. Updated the TLS and CA examples to use `file(...)`.
- The mutual TLS example created a Kubernetes Secret for the client CA, but the Gateway referenced a filesystem path with `caCertificates` that the example never mounted into the gateway pod. Updated the example to use `caCertCredentialName = "client-ca-cert"` and added an explicit `depends_on` for the TLS and CA secrets.
- The rollback explanation said teams can roll back by reverting to a previous Terraform state. Updated it to the safer and standard Terraform workflow of reverting the Terraform configuration and applying it again.

## Review Notes
- The cert-manager example is structurally correct, but real wildcard certificates require an issuer configured for DNS-01 validation.
- `depends_on` for a cert-manager `Certificate` ensures Terraform creates the Certificate resource before the Gateway, but certificate issuance and Secret creation are asynchronous.
