# Validation Summary: How to Configure TLS Inspection with Certificate Authority Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Secure Web Proxy
- Google Cloud Certificate Authority Service
- Google Cloud Network Security TLS inspection policies
- Google Cloud gateway security policies
- Google Cloud CLI
- Kubernetes ConfigMaps and Deployments
- Debian/Ubuntu CA trust store

## Sources Consulted
- Google Cloud Secure Web Proxy TLS inspection overview: https://docs.cloud.google.com/secure-web-proxy/docs/tls-inspection-overview
- Google Cloud Secure Web Proxy enable TLS inspection guide: https://docs.cloud.google.com/secure-web-proxy/docs/enable-tls-inspection
- Google Cloud Secure Web Proxy logs documentation: https://docs.cloud.google.com/secure-web-proxy/docs/monitor-logs
- Google Cloud SDK reference for `gcloud network-security tls-inspection-policies import`: https://docs.cloud.google.com/sdk/gcloud/reference/network-security/tls-inspection-policies/import
- Google Cloud SDK reference for `gcloud network-security tls-inspection-policies`: https://docs.cloud.google.com/sdk/gcloud/reference/network-security/tls-inspection-policies
- Google Cloud SDK reference for `gcloud network-security gateway-security-policies`: https://docs.cloud.google.com/sdk/gcloud/reference/network-security/gateway-security-policies
- Google Cloud SDK reference for `gcloud network-security gateway-security-policies rules`: https://docs.cloud.google.com/sdk/gcloud/reference/network-security/gateway-security-policies/rules
- Google Cloud SDK reference for `gcloud privateca roots create`: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/roots/create
- Google Cloud SDK reference for `gcloud privateca subordinates create`: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/subordinates/create
- Google Cloud IAM roles for Certificate Authority Service: https://docs.cloud.google.com/iam/docs/roles-permissions/privateca

## Issues Found
- The post used `gcloud network-security tls-inspection-policies create --ca-pool`, but the current documented CLI flow imports a YAML policy. Replaced it with a `tls-policy.yaml` example and `gcloud network-security tls-inspection-policies import`.
- The post attached TLS inspection directly to a Secure Web Proxy gateway and also showed a firewall endpoint association command. For Secure Web Proxy, TLS inspection is attached to the `GatewaySecurityPolicy`. Replaced this section with a gateway security policy YAML import.
- The post used `gcloud network-security gateway-security-policies rules create`, but the current documented stable CLI rule flow uses YAML import. Replaced inspect and bypass examples with rule YAML plus `gcloud network-security gateway-security-policies rules import`.
- The post granted `roles/privateca.certificateRequester` and `roles/privateca.workloadCertificateRequester`; the Secure Web Proxy TLS inspection guide grants `roles/privateca.certificateManager` to the Network Security service identity. Updated the IAM command and added the service identity creation command.
- The CA creation commands omitted `--auto-enable`, which would leave new CAs in the staged state by default. Added `--auto-enable` to the root and subordinate CA creation examples.
- The logging filters used the wrong monitored resource type and undocumented TLS inspection payload fields. Updated the examples to use `networkservices.googleapis.com/Gateway` and documented Secure Web Proxy gateway request log fields.
- The security notes described the public root CA certificate as highly sensitive and implied logs expose full plaintext content. Clarified that CA administration and trust distribution are sensitive, and that transaction logs include request metadata such as full URLs.

## Review Notes
The GKE ConfigMap example is valid as an application-specific trust bundle pattern, but production deployments often need to merge the internal root with the container image's existing public CA bundle or install it into the image/system trust store so public HTTPS roots remain trusted.
