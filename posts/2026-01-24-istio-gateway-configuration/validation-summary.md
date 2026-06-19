# Validation Summary: How to Handle Istio Gateway Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio DestinationRule subsets
- Kubernetes Secrets
- cert-manager Certificate resources
- istioctl
- kubectl

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio cert-manager integration: https://istio.io/latest/docs/ops/integrations/certmanager/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The Istio manifests used `networking.istio.io/v1beta1`. Istio networking APIs were promoted to `networking.istio.io/v1` in Istio 1.22, and the current official examples use `v1`, so the Gateway and VirtualService examples were updated to the current stable API version.
- The mTLS Gateway example combined `credentialName` with `caCertificates`. Istio documents `credentialName` as the Kubernetes secret reference for TLS material, including CA certificates for mutual TLS, and only one of file-based certificate fields or `credentialName` should be specified. Removed `caCertificates` from the example and changed the follow-up text to say the referenced secret should include `ca.crt`.
- The header-based routing example used `subset: canary` and `subset: stable` without noting that subsets must be defined in a DestinationRule. Added a short clarification before the example.

## Review Notes
The `kubectl` and `istioctl` binaries were not installed in the local environment, so CLI command validation was performed against the official Kubernetes and Istio command references rather than local `--help` output.
