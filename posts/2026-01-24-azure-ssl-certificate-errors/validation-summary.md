# Validation Summary: How to Fix 'SSL Certificate' Errors in Azure

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure App Service
- Azure Front Door
- Azure Key Vault certificates
- Azure Monitor scheduled query alerts
- Azure CLI
- OpenSSL
- certbot
- .NET HttpClient
- Python Requests
- TLS/SSL certificate validation

## Sources Consulted
- Microsoft Learn: Azure App Service TLS/SSL certificates - https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate
- Microsoft Learn: Azure App Service TLS overview - https://learn.microsoft.com/en-us/azure/app-service/overview-tls
- Microsoft Learn: Azure CLI `az webapp config ssl` - https://learn.microsoft.com/en-us/cli/azure/webapp/config/ssl
- Microsoft Learn: Azure CLI `az webapp config` - https://learn.microsoft.com/en-us/cli/azure/webapp/config
- Microsoft Learn: Azure CLI `az webapp config hostname` - https://learn.microsoft.com/en-us/cli/azure/webapp/config/hostname
- Microsoft Learn: Azure CLI `az afd custom-domain` - https://learn.microsoft.com/en-us/cli/azure/afd/custom-domain
- Microsoft Learn: Azure CLI `az keyvault certificate` - https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate
- Microsoft Learn: About Azure Key Vault certificates - https://learn.microsoft.com/en-us/azure/key-vault/certificates/about-certificates
- Microsoft Learn: Azure Key Vault alerts - https://learn.microsoft.com/en-us/azure/key-vault/general/alert
- Microsoft Learn: Azure Key Vault logging - https://learn.microsoft.com/en-us/azure/key-vault/general/logging
- Microsoft Learn: .NET `HttpClientHandler.ServerCertificateCustomValidationCallback` - https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclienthandler.servercertificatecustomvalidationcallback
- Microsoft Learn: ASP.NET Core runtime environments - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/environments
- OpenSSL documentation: `s_client` - https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL documentation: `pkcs12` - https://docs.openssl.org/3.5/man1/openssl-pkcs12/
- Requests documentation: Advanced usage SSL verification - https://requests.readthedocs.io/en/master/user/advanced/
- Certbot documentation - https://eff-certbot.readthedocs.io/

## Issues Found
- The certificate-chain verification text expected the server to send the root certificate. OpenSSL documents `-showcerts` as showing certificates sent by the server, and servers commonly omit trusted roots, so the expected output was changed to leaf plus intermediates.
- The PFX creation example passed a concatenated full chain as `-in`. The OpenSSL `pkcs12` export option supports `-in` for the leaf certificate and `-certfile` for extra certificates, so the command now uses `-certfile chain.crt`.
- Several App Service certificate binding examples omitted `--hostname` while describing a binding to a specific hostname. Azure CLI supports `--hostname` for `az webapp config ssl bind`, so the examples now include it.
- The TLS defaults statement was too broad. It now specifies that TLS 1.0 and 1.1 are disabled by default for new App Service apps, matching current Azure App Service documentation.
- The C# development-only certificate validation snippet used `Environment.IsDevelopment()`, which is not a static .NET API. It now checks the `ASPNETCORE_ENVIRONMENT` environment variable before assigning `ServerCertificateCustomValidationCallback`.
- The `cert-policy.json` block contained a JavaScript-style comment inside a `json` code block, making the shown JSON invalid. The filename label was moved outside the JSON block.
- The Azure Monitor scheduled-query alert example used an invalid condition shape and a non-documented `certificateExpiry_d` field. It now uses the current scheduled-query placeholder syntax and the documented Key Vault `CertificateNearExpiryEventGridNotification` operation.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI syntax was verified against current Microsoft Learn reference pages rather than local `az --help` output. The post remains a general troubleshooting guide; production deployments should still account for service-specific certificate requirements, DNS validation, action groups, Log Analytics workspace configuration, and organization-specific CA policies.
