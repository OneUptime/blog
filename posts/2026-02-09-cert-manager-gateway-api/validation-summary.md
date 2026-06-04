# Validation Summary: How to Use cert-manager Gateway API Integration for Certificate Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- cert-manager
- ACME HTTP-01 and DNS-01 challenges
- Envoy Gateway
- Helm
- Prometheus alerting
- TLS certificates and TLSRoute passthrough

## Sources Consulted
- cert-manager Gateway usage documentation: https://cert-manager.io/docs/usage/gateway/
- cert-manager ACME HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Route53 DNS-01 solver documentation: https://cert-manager.io/v1.16-docs/configuration/acme/dns01/route53
- Envoy Gateway Helm installation documentation: https://gateway.envoyproxy.io/docs/install/install-helm/
- Kubernetes Gateway API getting started documentation: https://gateway-api.sigs.k8s.io/guides/
- Kubernetes Gateway API TLSRoute documentation: https://gateway-api.sigs.k8s.io/reference/api-types/tlsroute/
- Kubernetes Gateway API API specification: https://gateway-api.sigs.k8s.io/reference/spec/

## Issues Found
- The Gateway API CRD install command used the older v1.0.0 bundle and did not use server-side apply. Updated it to the current v1.5.0 Standard channel install command with `kubectl apply --server-side`.
- The Envoy Gateway Helm install command used the older v1.0.0 chart. Updated it to v1.8.0 to match current Envoy Gateway documentation.
- The cert-manager Helm command used the legacy chart reference, the older `installCRDs` value, and the outdated `--enable-gateway-api` extra argument. Updated it to the current OCI chart, v1.20.2, `crds.enabled=true`, and `config.enableGatewayAPI=true`.
- The initial HTTP-01 examples requested a wildcard certificate through a Gateway listener. HTTP-01 cannot issue wildcard certificates, so the Gateway listener and explicit Certificate example now use `web.example.com`.
- The post claimed HTTPRoute annotations could trigger cert-manager to create a Certificate and update the Gateway listener. cert-manager's Gateway integration reconciles annotated Gateway listeners, not HTTPRoutes, so that section now shows adding an HTTPS Gateway listener for `api.example.com`.
- The TLSRoute example used `gateway.networking.k8s.io/v1alpha2`. TLSRoute is GA in the Standard channel as `gateway.networking.k8s.io/v1` in Gateway API v1.5.0, so the example was updated.
- The ReferenceGrant example used `gateway.networking.k8s.io/v1beta1`. Updated it to `gateway.networking.k8s.io/v1` for the current Gateway API bundle.
- The manual renewal command used the `cert-manager.io/issue-temporary-certificate` annotation, which creates temporary certificates while issuing and is not the recommended way to force renewal. Replaced it with `kubectl cert-manager renew`.

## Review Notes
The post is technically relevant and salvageable. Some examples remain controller-dependent, especially TLS options under `gateway.envoyproxy.io/*` and automatic Gateway reload behavior after Secret updates; those are implementation-specific and should be tested against the selected Gateway controller in production.
