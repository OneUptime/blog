# Validation Summary: How to Set Up Service Principal Auth with Certificate-Based Credentials in

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Entra ID app registrations and service principals
- Certificate-based client authentication
- Azure CLI
- Azure RBAC
- Azure Identity for Python
- Azure Identity for .NET
- Azure Key Vault Secrets client libraries
- OpenSSL
- PowerShell PKI cmdlets

## Sources Consulted
- Microsoft identity platform certificate credentials: https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials
- Azure CLI `az ad app` reference: https://learn.microsoft.com/en-us/cli/azure/ad/app?view=azure-cli-latest
- Azure CLI `az ad app credential` reference: https://learn.microsoft.com/en-us/cli/azure/ad/app/credential?view=azure-cli-latest
- Azure CLI service principal sign-in documentation: https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-service-principal?view=azure-cli-latest
- Azure CLI reference index for `az login` certificate warning: https://learn.microsoft.com/en-us/cli/azure/reference-index?view=azure-cli-latest
- Azure Identity Python `CertificateCredential`: https://learn.microsoft.com/en-us/python/api/azure-identity/azure.identity.certificatecredential?view=azure-python
- Azure Identity .NET `ClientCertificateCredential` constructors: https://learn.microsoft.com/en-us/dotnet/api/azure.identity.clientcertificatecredential.-ctor?view=azure-dotnet
- .NET `X509CertificateLoader.LoadPkcs12FromFile`: https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.x509certificates.x509certificateloader.loadpkcs12fromfile?view=net-9.0
- .NET SYSLIB0057 certificate loading guidance: https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib0057
- PowerShell `New-SelfSignedCertificate`: https://learn.microsoft.com/en-us/powershell/module/pki/new-selfsignedcertificate?view=windowsserver2025-ps
- PowerShell `Export-Certificate`: https://learn.microsoft.com/en-us/powershell/module/pki/export-certificate?view=windowsserver2025-ps
- PowerShell `Export-PfxCertificate`: https://learn.microsoft.com/en-us/powershell/module/pki/export-pfxcertificate?view=windowsserver2025-ps
- Azure RBAC role assignments with Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli

## Issues Found
- The OpenSSL flow created `.key`, `.crt`, and `.pfx` files but later examples referenced a combined `.pem` file. Added a command to create `service-principal.pem` with the private key and certificate.
- The PowerShell comment said the certificate was stored in the local machine certificate store while the code used `Cert:\CurrentUser\My`. Updated the comment to match the command.
- The app registration command used inline `--key-value` certificate processing with a fragile `grep` expression. Replaced it with documented `az ad app create` plus `az ad app credential reset --cert @service-principal.crt --append`.
- The .NET example mixed named and positional arguments and did not supply the PFX password for the password-protected PFX generated earlier. Updated it to load the PFX with `X509CertificateLoader.LoadPkcs12FromFile` and pass the resulting `X509Certificate2` to `ClientCertificateCredential`.
- The Windows certificate store .NET example used the wrong named parameter, `certificate`, for `ClientCertificateCredential`. Changed it to the documented `clientCertificate` parameter.
- The Azure CLI login example used `--password` for a certificate. Current Azure CLI documentation uses `--certificate`, and the CLI reference notes that `--password` no longer accepts service principal certificates. Updated the command and note.
- The certificate deletion command omitted `--cert`. Added `--cert` so it targets certificate credentials as documented.

## Review Notes
- The technical approach is current and valid: Microsoft identity platform supports certificate credentials as signed JWT client assertions, Azure SDK credential classes support certificate authentication, and Azure CLI supports service-principal certificate sign-in with a combined PEM file.
- Azure CLI was not installed in the local environment, so CLI flags were validated against official Microsoft Learn documentation rather than local `az --help` output.
