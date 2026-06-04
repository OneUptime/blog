# Validation Summary: How to Use cert-manager SelfSigned Issuer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager
- cert-manager SelfSigned Issuer
- cert-manager CA Issuer
- Kubernetes Ingress
- TLS and mTLS
- OpenSSL
- kubectl
- cmctl
- PowerShell certificate import

## Sources Consulted
- cert-manager SelfSigned issuer documentation: https://cert-manager.io/docs/configuration/selfsigned/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Ingress usage and ingress-shim annotations: https://cert-manager.io/docs/usage/ingress/
- cert-manager annotations reference: https://cert-manager.io/docs/reference/annotations/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager cmctl renew documentation: https://cert-manager.io/v1.11-docs/reference/cmctl/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- OpenSSL s_server documentation: https://docs.openssl.org/1.1.1/man1/s_server/
- OpenSSL s_client documentation: https://docs.openssl.org/1.1.1/man1/s_client/
- Microsoft Import-Certificate documentation: https://learn.microsoft.com/en-us/powershell/module/pki/import-certificate
- Microsoft Convert.FromBase64String documentation: https://learn.microsoft.com/en-us/dotnet/api/system.convert.frombase64string

## Issues Found
- Direct SelfSigned Certificate examples did not set a subject distinguished name. cert-manager documents that SelfSigned certificates without a subject DN can have an empty issuer DN and are technically invalid under RFC 5280. Added `spec.subject.organizations` to direct SelfSigned Certificate examples and `cert-manager.io/subject-organizations` to the Ingress example.
- The troubleshooting section used `cert-manager.io/issue-temporary-certificate="true"` as a manual renewal trigger. That annotation only causes a temporary certificate to be written while issuance is pending. Replaced it with `cmctl renew dev-tls`, which is the documented manual renewal command.
- The Windows PowerShell example used a Unix-style `base64 -d` pipeline. Replaced it with PowerShell/.NET base64 decoding before calling `Import-Certificate`.

## Review Notes
- The CA issuer examples correctly place the root CA secret in the `cert-manager` namespace for use by a `ClusterIssuer`, matching cert-manager's default cluster resource namespace behavior.
- The OpenSSL mTLS commands use supported `s_server` and `s_client` options. In stricter tests, adding `-verify_return_error` to `s_server` can make verification failures terminate the connection instead of only reporting them.
