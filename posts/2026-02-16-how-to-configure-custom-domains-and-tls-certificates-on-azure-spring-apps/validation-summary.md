# Validation Summary: How to Configure Custom Domains and TLS Certificates on Azure Spring Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Spring Apps
- Azure CLI
- Azure Key Vault certificates
- DNS CNAME records
- TLS/SSL certificates
- Spring Boot
- Spring Security
- OpenSSL and curl verification

## Sources Consulted
- Microsoft Learn: Map an existing custom domain to Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-custom-domain
- Microsoft Learn: Azure CLI reference for `az spring app custom-domain` - https://learn.microsoft.com/en-us/cli/azure/spring/app/custom-domain?view=azure-cli-latest
- Microsoft Learn: Azure CLI reference for `az spring certificate` - https://learn.microsoft.com/en-us/cli/azure/spring/certificate?view=azure-cli-latest
- Microsoft Learn: Use TLS/SSL certificates in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-use-tls-certificate
- Microsoft Learn: Azure CLI reference for `az keyvault certificate` - https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate?view=azure-cli-latest
- Spring Boot Reference: Running Behind a Front-end Proxy Server - https://docs.spring.io/spring-boot/how-to/webserver.html
- Spring Security Reference: HTTP, HTTPS redirects, and proxy server configuration - https://docs.spring.io/spring-security/reference/features/exploits/http.html

## Issues Found
- The post described domain verification as using CNAME or TXT records and included an `asuid` TXT example. Azure Spring Apps custom domain documentation uses a CNAME record for mapping and validation, so the TXT guidance was removed.
- The post claimed apex domains could be mapped with an A record to a Spring Apps IP address. Microsoft documents that A records are not supported for Azure Spring Apps custom domain mapping, so the apex-domain A record section was replaced with CNAME-only guidance.
- The certificate import commands used unsupported `az spring certificate add` options such as `--type`, `--vault-name`, `--certificate-file`, and `--password`. These were replaced with the documented Key Vault flow using `az keyvault certificate import` and `az spring certificate add --vault-uri --vault-certificate-name`.
- The Key Vault access example used the Spring Apps instance managed identity. Microsoft documents granting access to Azure Spring Apps Domain-Management for custom-domain certificates, with certificate and secret `get`/`list` permissions, so the access policy command was corrected.
- The HTTPS redirect section said this must be done at the Spring Boot application level. Azure Spring Apps supports an HTTPS Only setting through `az spring app update --https-only`, so that command was added and the Spring Boot configuration was limited to proxy header handling or optional app-level redirects.
- The Spring Boot YAML included `spring.security.require-ssl`, which is not the current documented way to configure HTTPS redirects in Spring Security. It was removed in favor of `server.forward-headers-strategy` plus the existing `requiresChannel` Java example.
- The renewal command repeated the unsupported direct PFX upload options. It was updated to use Key Vault-backed certificate import syntax.
- The post omitted the current Azure Spring Apps retirement caveat. A short note was added that Basic, Standard, and Enterprise plans are in a retirement period.

## Review Notes
The Azure CLI `az spring` command group is currently documented by Microsoft for these workflows, but the CLI reference marks it as deprecated because Azure Spring Apps Basic, Standard, and Enterprise plans are in retirement. The commands remain aligned with Microsoft Learn for existing Azure Spring Apps services.
