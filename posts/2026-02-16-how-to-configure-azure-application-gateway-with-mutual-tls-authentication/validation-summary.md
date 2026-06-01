# Validation Summary: How to Configure Azure Application Gateway with Mutual TLS Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Gateway v2
- Azure CLI
- Mutual TLS (mTLS)
- X.509 certificates and certificate chains
- OCSP certificate revocation checking
- Application Gateway rewrite rules and access logs
- OpenSSL
- curl
- Azure Monitor Log Analytics / KQL

## Sources Consulted
- Azure Application Gateway mutual authentication overview: https://learn.microsoft.com/en-us/azure/application-gateway/mutual-authentication-overview
- Export trusted client CA certificate chain for client authentication: https://learn.microsoft.com/en-us/azure/application-gateway/mutual-authentication-certificate-management
- Azure CLI `az network application-gateway client-cert`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/client-cert
- Azure CLI `az network application-gateway ssl-profile`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/ssl-profile
- Azure CLI `az network application-gateway http-listener`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-listener
- Azure CLI `az network application-gateway rewrite-rule`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rewrite-rule
- Azure CLI `az network application-gateway rewrite-rule set`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rewrite-rule/set
- Azure CLI `az network application-gateway rule`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rule
- Application Gateway rewrite server variables: https://learn.microsoft.com/en-us/azure/application-gateway/rewrite-http-headers-url
- Azure Application Gateway monitoring data reference: https://learn.microsoft.com/en-us/azure/application-gateway/monitor-application-gateway-reference
- Azure Monitor `AGWAccessLogs` table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/AGWAccessLogs

## Issues Found
- The trusted client certificate upload command used `--data @ca-chain.pem`. Azure CLI documents `--data` as a certificate file path, so it was changed to `--data ca-chain.pem`.
- The SSL profile command passed a JSON object to `--client-auth-configuration`, but the current Azure CLI option is a boolean. The command now enables client authentication with `--client-auth-configuration true`, followed by a generic update that sets `clientAuthConfiguration.verifyClientCertIssuerDN=true`.
- The explanation of `verifyClientCertIssuerDN` was too broad. It now states that Application Gateway verifies the client certificate's immediate issuer distinguished name against the trusted client CA certificate chain.
- The listener commands used `--ssl-profile`, but the documented Azure CLI parameter for `http-listener create` and `http-listener update` is `--ssl-profile-id`. Both examples were corrected.
- The header forwarding section implied that backend HTTP settings automatically enable client certificate headers. Application Gateway exposes mTLS data as server variables, so the section now creates a rewrite rule set, adds headers from `{var_client_certificate_*}` variables, and attaches the rewrite rule set to a routing rule.
- The post described CRL upload for revocation, but Application Gateway documents client certificate revocation checking through OCSP. The section was corrected to enable `clientAuthConfiguration.verifyClientRevocation=OCSP`.
- The monitoring query used non-documented field names such as `sslClientCertificateVerifyResult_s`. It now uses the documented `AGWAccessLogs` table fields `SslClientVerify`, `SslClientCertificateIssuerName`, `ClientIp`, and `RequestUri`, and filters out values that start with `SUCCESS`.
- The failure examples and common issue text said mTLS failures return 403. Microsoft documentation describes Application Gateway returning HTTP 400 for certificate validation and revocation failures, so the failure wording was corrected.

## Review Notes
The post is technically relevant and salvageable. The high-level mTLS explanation, certificate chain order, OpenSSL examples, curl testing approach, and listener-level limitation for per-path policies are broadly correct. Azure CLI was not installed in the local environment, so CLI command verification was performed against current Microsoft Learn CLI reference pages instead of local `az --help` output.
