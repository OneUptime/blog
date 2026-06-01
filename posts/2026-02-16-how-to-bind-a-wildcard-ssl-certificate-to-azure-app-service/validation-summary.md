# Validation Summary: How to Bind a Wildcard SSL Certificate to Azure App Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure App Service Certificates
- Azure Key Vault
- Azure CLI
- TLS/SSL certificates
- Wildcard certificates
- DNS CNAME and TXT validation records
- Let's Encrypt and Certbot
- OpenSSL PKCS#12/PFX export

## Sources Consulted
- Microsoft Learn: Install a TLS/SSL Certificate for Your App - Azure App Service, https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate
- Microsoft Learn: Buy and manage App Service certificates, https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-app-service-certificate
- Microsoft Learn: Set up an existing custom domain name for your app - Azure App Service, https://learn.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain
- Microsoft Learn: az webapp config ssl, https://learn.microsoft.com/en-us/cli/azure/webapp/config/ssl
- Microsoft Learn: az webapp config hostname, https://learn.microsoft.com/en-us/cli/azure/webapp/config/hostname
- Microsoft Learn: az webapp config, https://learn.microsoft.com/en-us/cli/azure/webapp/config
- Microsoft Learn: az webapp, https://learn.microsoft.com/en-us/cli/azure/webapp
- Microsoft Learn: az keyvault and az keyvault certificate, https://learn.microsoft.com/en-us/cli/azure/keyvault and https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate
- Let's Encrypt documentation: Challenge Types, https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt FAQ, https://letsencrypt.org/docs/faq/
- RFC 6125: Service Identity in TLS, https://www.rfc-editor.org/rfc/rfc6125

## Issues Found
- The Azure App Service Certificate purchase steps said to enter `*.myapp.com`. Microsoft documents the App Service Certificate creation field as the naked/root domain with a wildcard SKU, so this was changed to `myapp.com`.
- The third-party CA section said certificates are valid for 1-2 years. Public TLS certificates are no longer issued for two-year validity periods, so this was changed to about one year.
- The OpenSSL PFX export command omitted compatibility flags recommended by Microsoft for OpenSSL 3-generated PFX files. Added `-keypbe PBE-SHA1-3DES`, `-certpbe PBE-SHA1-3DES`, and `-macalg SHA1`.
- The Azure CLI `az webapp config ssl bind` examples did not specify `--hostname`, which is needed to bind the certificate to a specific custom domain when multiple hostnames are configured. Added `--hostname "api.myapp.com"` to both bind examples.
- The Key Vault access example used an access policy flow after creating a new vault. Current Azure CLI Key Vault behavior defaults data-plane authorization to RBAC, and Microsoft documents `Key Vault Certificate User` for App Service Key Vault certificate sync. Replaced the `az ad sp show` and `az keyvault set-policy` sequence with an RBAC role assignment scoped to the Key Vault.
- The HTTPS-only command used a generic `--set httpsOnly=true` update. Replaced it with the current documented `az webapp update --https-only true` option.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against current official Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
