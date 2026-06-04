# Validation Summary: Use cert-manager ACME External Account Binding for Enterprise Let's Encrypt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- cert-manager
- ACME
- External Account Binding (EAB)
- Kubernetes Secrets
- Kubernetes ClusterIssuer and Certificate resources
- ZeroSSL ACME
- Google Trust Services Public CA
- Let's Encrypt ACME
- Route53 DNS-01 challenges

## Sources Consulted
- cert-manager ACME issuer documentation: https://cert-manager.io/docs/configuration/acme/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Route53 DNS-01 documentation: https://cert-manager.io/v1.16-docs/configuration/acme/dns01/route53
- RFC 8555, Automatic Certificate Management Environment (ACME): https://www.rfc-editor.org/rfc/rfc8555
- ZeroSSL ACME documentation: https://zerossl.com/documentation/acme/
- Google Cloud Public CA ACME documentation: https://docs.cloud.google.com/certificate-manager/docs/public-ca
- Google Cloud Public CA ACME client tutorial: https://docs.cloud.google.com/certificate-manager/docs/public-ca-tutorial
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic

## Issues Found
- The post described "Enterprise Let's Encrypt" and used a non-documented `https://acme-enterprise.letsencrypt.org/directory` endpoint. Replaced those examples with Google Trust Services Public CA, which officially requires EAB and documents production and staging ACME directory URLs.
- The EAB HMAC key was described as regular base64. Updated the wording and examples to use base64url, matching cert-manager, RFC 8555, and Google Public CA guidance.
- The cert-manager example used `externalAccountBinding.keyAlgorithm: HS256`. Removed it because cert-manager documents this field as deprecated for cert-manager v1.3.0 and later.
- HTTP-01 examples used the legacy `class: nginx` solver field. Replaced it with `ingressClassName: nginx`, which cert-manager documents as the recommended field for most ingress controllers.
- The Kubernetes Secret examples stored `key-id` even though cert-manager's `keyID` is configured directly in the Issuer and only the MAC key is read from `keySecretRef`. Removed the unused secret key from the commands.
- The EAB rotation section restarted cert-manager after updating the Secret. Replaced that with guidance to update `externalAccountBinding.keyID` when the Key ID changes and noted that EAB is used during ACME account registration, so credential rotation may require a new ACME account/private key secret.
- The HMAC troubleshooting commands used `base64 -d`, which is not a reliable validation step for unpadded base64url values. Updated the example to preserve provider-supplied base64url keys and only encode raw keys when needed.

## Review Notes
The examples remain provider-dependent: EAB credential reuse, expiry, staging availability, and rate limits vary by ACME provider. Users should check their provider's current documentation before rotating credentials or creating multiple ACME accounts.
