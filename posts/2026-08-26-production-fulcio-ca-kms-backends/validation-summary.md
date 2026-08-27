# Validation Summary: How to Back a Production Fulcio CA with AWS KMS, Google Cloud KMS, Azure Key Vault, or Vault

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Fulcio and its `kmsca` signing backend
- Sigstore KMS provider library and private PKI trust distribution
- AWS KMS and the AWS SDK for Go v2
- Google Cloud KMS and the Google Cloud CLI
- Azure Key Vault, Azure CLI, and Azure RBAC
- HashiCorp Vault Transit secrets engine
- X.509 CA certificates and OpenSSL
- Certificate Transparency, Rekor, and Sigstore trusted-root material

## Sources Consulted

- [Fulcio KMS setup documentation](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/docs/setup.md#kms)
- [Fulcio server flags and KMS signer construction](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/cmd/app/serve.go)
- [Fulcio `kmsca` implementation](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/kmsca/kmsca.go)
- [Fulcio CA-chain and signer-key validation](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/common.go)
- [Fulcio certificate issuance and embedded-SCT flow](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/baseca/baseca.go)
- [Fulcio certificate profile](https://github.com/sigstore/architecture-docs/blob/30974174a4aa05a2c73509a1d4391bd44c7eb764/fulcio-spec.md#7-certificate-profile)
- [Sigstore v1.10.8 AWS KMS provider](https://github.com/sigstore/sigstore/tree/v1.10.8/pkg/signature/kms/aws)
- [Sigstore v1.10.8 Google Cloud KMS provider](https://github.com/sigstore/sigstore/tree/v1.10.8/pkg/signature/kms/gcp)
- [Sigstore v1.10.8 Azure Key Vault provider](https://github.com/sigstore/sigstore/tree/v1.10.8/pkg/signature/kms/azure)
- [Sigstore v1.10.8 HashiCorp Vault provider](https://github.com/sigstore/sigstore/tree/v1.10.8/pkg/signature/kms/hashivault)
- [Sigstore public-key equality implementation](https://github.com/sigstore/sigstore/blob/c761681120b37d9c4b1410cf5720571582ab090a/pkg/cryptoutils/publickey.go)
- [AWS KMS asymmetric-key creation](https://docs.aws.amazon.com/kms/latest/developerguide/asymm-create-key.html), [AWS CLI `create-key`](https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html), and [AWS SDK for Go v2 Region configuration](https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-gosdk.html)
- [Google Cloud CLI `kms keys create`](https://cloud.google.com/sdk/gcloud/reference/kms/keys/create), [Cloud KMS IAM permissions](https://cloud.google.com/kms/docs/reference/permissions-and-roles), and [Cloud KMS audit logging](https://cloud.google.com/kms/docs/audit-logging)
- [Google Cloud Data Access audit-log configuration](https://cloud.google.com/logging/docs/audit/configure-data-access)
- [Azure CLI `keyvault key create`](https://learn.microsoft.com/en-us/cli/azure/keyvault/key), [Azure Key Vault RBAC guide](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide), and [Azure Key Vault data actions](https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/security)
- [Azure Key Vault Get Key API](https://learn.microsoft.com/en-us/rest/api/keyvault/keys/get-key/get-key) and [Sign API](https://learn.microsoft.com/en-us/rest/api/keyvault/keys/sign/sign)
- [Sigstore Azure RSA-support issue](https://github.com/sigstore/sigstore/issues/1528)
- [HashiCorp Vault Transit API](https://developer.hashicorp.com/vault/api-docs/secret/transit), [Transit documentation](https://developer.hashicorp.com/vault/docs/secrets/transit), and [Vault audit-device documentation](https://developer.hashicorp.com/vault/docs/audit)
- [OpenSSL `verify` documentation](https://docs.openssl.org/master/man1/openssl-verify/) and [OpenSSL `x509` documentation](https://docs.openssl.org/master/man1/openssl-x509/)

## Issues Found

- The post said Fulcio loaded both the signer and chain once in a way that implied every key selection was fixed at startup. Fulcio constructs the signer and reads the chain once, but AWS aliases and unversioned provider references can resolve different key material while the loaded certificate chain remains unchanged. The explanation now distinguishes those behaviors and requires a pinned resource plus a coordinated restart for a deliberate pinned-key change.
- The Vault guidance treated a Transit key's current version like a version that could be pinned in `--kms-resource`. Fulcio's `hashivault://` resource syntax cannot select a Transit version, and the driver otherwise signs with the latest version. The post now requires a new named Transit key for each CA generation and repeats that constraint in the rotation procedure.
- The Azure guidance included RSA as a typical supported choice. The Azure driver in Fulcio's pinned Sigstore v1.10.8 dependency supports ECDSA signing algorithms and transforms returned signatures as ECDSA values; RSA support remains unresolved. The post now specifies an Azure ECDSA key.
- The Azure creation command granted both `sign` and `verify`, although Fulcio retrieves the public key and verifies locally. The command now grants only `sign`, and the runtime authorization text names the required data-plane `get` and `sign` permissions.
- The Google Cloud least-privilege list omitted metadata calls made by the Sigstore driver. The post now includes `cloudkms.cryptoKeys.get`, version `get` or `list` as appropriate, `viewPublicKey`, and `useToSign`.
- The certificate-key comparison was described as a byte-for-byte SubjectPublicKeyInfo comparison. Fulcio parses the keys and compares their public-key values semantically. The wording now requires the SubjectPublicKeyInfo to represent the same public key.
- The AWS example relied on the Region embedded in the KMS ARN, but Sigstore's AWS provider loads the SDK Region from the AWS configuration chain. The example now requires `AWS_REGION=eu-west-1` or equivalent shared configuration.
- The cross-provider startup text omitted Vault's required endpoint configuration. It now documents `VAULT_ADDR` and the optional `TRANSIT_SECRET_ENGINE_PATH` override.
- The audit-log test assumed that every provider log exposed an exact key version and was already enabled. The test now requires enabling the data-plane audit stream, asks for a version only where the provider exposes one, and calls out that Google Cloud Data Access logs and Vault audit devices are not enabled by default.

## Review Notes

- The review used Fulcio main commit `ae51cd5b978de4389588cbb20cb08845e4e8b98c` from 2026-08-26 and the Sigstore KMS dependency version (`v1.10.8`) pinned by that commit. Provider behavior, especially Azure algorithm support and URI parsing, should be revalidated when those dependencies change.
- The four provider key-creation commands and the four example resource URI formats were otherwise valid. The Fulcio flags, signer-first certificate-chain order, startup checks, certificate-profile guidance, issuance tests, listener guidance, and trust-overlap rotation advice matched the reviewed implementation and specification.
- Fulcio's startup checks do not enforce every field in the full Fulcio CA profile. The post correctly retains separate extension inspection and staged-startup testing rather than treating OpenSSL path validation as a complete profile lint.
