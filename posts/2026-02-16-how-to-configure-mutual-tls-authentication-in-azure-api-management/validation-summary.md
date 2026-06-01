# Validation Summary: How to Configure Mutual TLS Authentication in Azure API Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure API Management
- Mutual TLS (mTLS)
- APIM policies
- APIM backend entities
- X.509 certificates
- curl
- C# HttpClient
- Python requests

## Sources Consulted
- Microsoft Learn: Secure APIs using client certificate authentication in API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-mutual-certificates-for-clients
- Microsoft Learn: Azure API Management policy reference - validate-client-certificate - https://learn.microsoft.com/en-us/azure/api-management/validate-client-certificate-policy
- Microsoft Learn: Azure API Management policy reference - authentication-certificate - https://learn.microsoft.com/en-us/azure/api-management/authentication-certificate-policy
- Microsoft Learn: Secure backend services by using client certificate authentication in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-mutual-certificates
- Microsoft Learn: Azure API Management Backends - https://learn.microsoft.com/en-us/azure/api-management/backends
- Microsoft Learn: Backend - Create Or Update REST API - https://learn.microsoft.com/en-us/rest/api/apimanagement/backend/create-or-update
- Microsoft Learn: Azure API Management policy reference - trace - https://learn.microsoft.com/en-us/azure/api-management/trace-policy
- curl man page - https://curl.se/docs/manpage.html
- Microsoft Learn: Configure certificate authentication in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/authentication/certauth
- Requests documentation: Advanced Usage - https://requests.readthedocs.io/en/stable/user/advanced/

## Issues Found
- The client certificate negotiation section incorrectly said the Consumption tier has client certificate negotiation enabled by default. Updated it to reflect current APIM guidance: classic Developer, Basic, Standard, and Premium tiers use "Negotiate client certificate" on the gateway hostname, while Consumption and v2 tiers use "Request client certificate."
- Several APIM policy XML snippets used unescaped double quotes inside double-quoted XML attributes. Changed affected policy expression attributes to single-quoted XML attributes so the examples are valid XML.
- Manual thumbprint, issuer, subject, and rotation checks did not verify the certificate chain before trusting certificate fields. Added `context.Request.Certificate.Verify()` checks where the snippets enforce trusted client certificates.
- The `validate-client-certificate` example used unsupported `failed-validation-httpcode` and `failed-validation-error-message` attributes and an unsupported `issuer` identity attribute. Replaced them with supported `ignore-error="false"` and `issuer-subject`.
- The backend entity JSON used `credentials.certificate` with a certificate ID. Updated it to `credentials.certificateIds`, which is the correct field when referencing certificate IDs in the APIM Backend REST contract.
- The Named Values thumbprint rotation example had no rejection path for invalid certificates. Added an `otherwise` branch returning `403 Forbidden`.

## Review Notes
The client-side curl, C# HttpClient, and Python requests examples are technically correct for common PEM/PFX client certificate usage. In production, avoid logging full certificate identity details unless the logs are protected and retention is appropriate.
