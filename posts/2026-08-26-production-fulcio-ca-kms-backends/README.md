# How to Back a Production Fulcio CA with AWS KMS, Google Cloud KMS, Azure Key Vault, or Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, AWS KMS, Google Cloud KMS, Azure Key Vault, HashiCorp Vault, Private PKI

Description: Configure Fulcio's KMS signing backend with a protected AWS, Google Cloud, Azure, or Vault key, a matching CA chain, least-privilege runtime identity, and a tested rotation plan.

---

Fulcio's `kmsca` backend keeps the CA private key behind a remote signing API. It does not turn an arbitrary KMS key into a CA by itself. You must create an asymmetric signing key, have that public key certified as a Fulcio root or intermediate, and give Fulcio the resulting PEM chain in signer-to-root order.

For production, prefer a KMS-backed intermediate beneath an offline root. Compromise of the online Fulcio workload or its KMS authorization can then be contained by replacing the intermediate without replacing the root already installed in every verifier.

## Understand What Fulcio Loads

Current Fulcio accepts this backend configuration:

```text
--ca=kmsca
--kms-resource=PROVIDER_URI
--kms-cert-chain-path=/etc/fulcio/ca-chain.pem
```

At startup, Fulcio:

1. opens the KMS signer identified by `--kms-resource`;
2. reads every certificate from `--kms-cert-chain-path`;
3. verifies the first certificate through the last certificate as a code-signing CA chain;
4. checks that the first certificate's public key equals the KMS signer's public key; and
5. rejects weak signer keys.

The chain file is ordered as:

```text
Fulcio intermediate certificate
optional higher intermediate certificates
offline root certificate
```

Do not put a Fulcio-issued ten-minute leaf in this file. If Fulcio signs directly as a root, the file contains that self-signed root only.

The current `kmsca` implementation loads both signer and chain once. It does not watch the chain file. A provider key version change therefore needs a coordinated Fulcio restart with a chain whose first certificate certifies the selected version.

## Create a Dedicated Asymmetric Signing Key

Use a different key for each environment and purpose. Do not reuse a TLS, Rekor, CT-log, timestamping, or application key. The current URI forms accepted by Fulcio's Sigstore KMS library are:

| Provider | Example Fulcio resource |
| --- | --- |
| AWS KMS | `awskms:///arn:aws:kms:eu-west-1:123456789012:key/UUID` |
| Google Cloud KMS | `gcpkms://projects/acme/locations/global/keyRings/sigstore/cryptoKeys/fulcio-intermediate/cryptoKeyVersions/1` |
| Azure Key Vault | `azurekms://acme-prod.vault.azure.net/fulcio-intermediate/VERSION` |
| HashiCorp Vault Transit | `hashivault://fulcio-intermediate` |

Pin an immutable key ARN or version wherever the provider and driver support it. An AWS alias, unversioned Google or Azure name, or Vault key's current version can move to a different public key. A CA certificate cannot move with it automatically.

The Sigstore certificate profile recommends ECDSA P-384 or stronger, or RSA-4096, for a root or intermediate. Confirm the exact key algorithm works end to end with the Fulcio release and provider driver you pin. Typical provider choices are an AWS `SIGN_VERIFY` asymmetric key, a Google Cloud `ASYMMETRIC_SIGN` key version, an Azure EC/RSA key with `sign` and `verify` operations, or a Vault Transit ECDSA/RSA signing key.

For example, the provider-native creation commands can start with:

```bash
# AWS KMS
aws kms create-key \
  --key-spec ECC_NIST_P384 \
  --key-usage SIGN_VERIFY

# Google Cloud KMS (after creating the key ring)
gcloud kms keys create fulcio-intermediate \
  --location global \
  --keyring sigstore \
  --purpose asymmetric-signing \
  --default-algorithm ec-sign-p384-sha384

# Azure Key Vault
az keyvault key create \
  --vault-name acme-prod \
  --name fulcio-intermediate \
  --kty EC-HSM \
  --curve P-384 \
  --ops sign verify

# Vault Transit
vault secrets enable transit
vault write transit/keys/fulcio-intermediate \
  type=ecdsa-p384 \
  exportable=false \
  allow_plaintext_backup=false
```

These are starting points, not a complete security boundary. Provider availability, HSM tier, deletion protection, quorum or approval policy, network controls, audit logging, backup behavior, and regional recovery all belong in the CA design.

## Certify the KMS Public Key

Export only the public key and take it to the root-signing ceremony. Issue an intermediate that follows Sigstore's Fulcio profile:

- nonempty organization and common name;
- critical `CA:TRUE` basic constraints, preferably `pathlen:0`;
- critical Key Usage containing only Certificate Sign and CRL Sign;
- noncritical Extended Key Usage containing only Code Signing;
- Subject Key Identifier and an Authority Key Identifier matching the parent's SKI;
- a unique, random, positive 160-bit serial number;
- a lifetime no longer than the root, with roughly three years suggested; and
- preferably the same signature scheme as the root.

The certificate's SubjectPublicKeyInfo must be byte-for-byte the public key for the exact KMS key version Fulcio will open. Preserve a ceremony record containing the provider resource, public-key fingerprint, certificate fingerprint, serial, validity interval, approvers, and generated chain.

Build the runtime chain with the signer first:

```bash
cat fulcio-intermediate.pem offline-root.pem > ca-chain.pem

openssl verify \
  -CAfile offline-root.pem \
  -purpose any \
  fulcio-intermediate.pem

openssl x509 -in fulcio-intermediate.pem -noout \
  -subject -issuer -serial -dates -fingerprint -sha256
```

OpenSSL path verification alone does not enforce every Sigstore profile rule. Inspect the extensions explicitly and let a staged Fulcio process perform its own key-match and code-signing-chain checks before production rollout.

## Give Fulcio Only Runtime Signing Access

The Fulcio workload needs to read the public portion or metadata and request signatures. It should not create, rotate, disable, schedule deletion of, change policy on, or export keys.

Use the provider's workload identity instead of long-lived credentials:

- an IAM role for service accounts or task role for AWS;
- Workload Identity Federation or an attached service account for Google Cloud;
- managed identity or workload identity federation for Azure; or
- a short-lived, renewable Vault token obtained from an appropriate workload auth method.

Scope authorization to one key. For Google Cloud this normally includes `cloudkms.cryptoKeyVersions.useToSign` and `cloudkms.cryptoKeyVersions.viewPublicKey`. For Azure, use data-plane crypto permissions rather than control-plane Contributor access. For Vault Transit, grant only the required key read and `transit/sign/fulcio-intermediate/*` update paths, adjusted for the configured mount.

Never put a Vault token, cloud secret, or file-backed service-account key in the command line or image. Ensure the provider's TLS endpoint is authenticated; do not use insecure TLS bypass environment variables.

## Start Fulcio with a Pinned Resource

An AWS example is:

```bash
fulcio-server serve \
  --ca=kmsca \
  --kms-resource='awskms:///arn:aws:kms:eu-west-1:123456789012:key/UUID' \
  --kms-cert-chain-path=/etc/fulcio/ca-chain.pem \
  --config-path=/etc/fulcio-config/config.yaml \
  --ct-log-url=https://ct.example.com/acme-2026 \
  --ct-log-public-key-path=/etc/fulcio/ct-log-public-key.pem
```

Change only the provider URI for Google Cloud, Azure, or Vault. `--gcp-kms-retries` and `--gcp-kms-timeout` apply only to the Google KMS path in current Fulcio. Do not assume they configure other providers.

Fulcio's HTTP listener does not terminate TLS. Place it behind an authenticated, TLS-terminating proxy or ingress. Protect the gRPC listener separately if it is exposed.

## Test Issuance and Failure Modes

Before admitting production traffic:

- confirm startup fails with a deliberately mismatched chain in a nonproduction test;
- issue a certificate and verify it against the offline root;
- verify its single SAN, OIDC issuer extension, critical Digital Signature usage, Code Signing EKU, ten-minute lifetime, and embedded SCT;
- verify a signed test artifact with the complete private Sigstore trusted root;
- revoke the workload's signing permission and confirm issuance fails closed;
- test KMS throttling and network loss without silently changing backends; and
- confirm provider audit logs identify the exact Fulcio workload and key version for every signature.

Alert on use by another principal, unexpected regions or networks, administrative key changes, scheduled deletion, disabled versions, and a signature rate that cannot be reconciled with Fulcio issuance.

## Rotate Without Breaking the Chain

Do not rotate a provider key in place and hope Fulcio follows it. Create a new key/version, certify its public key, publish the new CA chain and verification trust through your authenticated distribution system, then roll Fulcio to a resource URI pinned to the new key and the matching chain.

During the overlap, verifiers must still trust signatures and certificates produced under the old CA material. Keep historical Fulcio, CT, Rekor, and timestamp verification material with correct validity intervals. Only disable or schedule deletion of the old KMS key after no server can use it and the incident/recovery policy permits it; retaining public verification material does not require retaining signing capability.

## Official Documentation

- [Fulcio signing-backend setup and KMS flags](https://github.com/sigstore/fulcio/blob/main/docs/setup.md#kms)
- [Current Fulcio KMS backend implementation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/kmsca/kmsca.go)
- [Fulcio server flags and startup chain loading](https://github.com/sigstore/fulcio/blob/main/cmd/app/serve.go)
- [Fulcio certificate profile](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#7-certificate-profile)
- [Sigstore KMS provider URI implementations](https://github.com/sigstore/sigstore/tree/main/pkg/signature/kms)
- [AWS KMS asymmetric-key creation](https://docs.aws.amazon.com/kms/latest/developerguide/asymm-create-key.html)
- [Google Cloud KMS asymmetric signing](https://cloud.google.com/kms/docs/create-validate-signatures)
- [Azure Key Vault key creation](https://learn.microsoft.com/en-us/cli/azure/keyvault/key)
- [Azure Key Vault authentication and RBAC](https://learn.microsoft.com/en-us/azure/key-vault/general/authentication)
- [HashiCorp Vault Transit signing keys](https://developer.hashicorp.com/vault/docs/secrets/transit)

## Conclusion

A production Fulcio KMS deployment is a coordinated key, certificate, identity, transparency, and trust-distribution system. Pin one protected asymmetric signer, certify that exact public key as a profile-compliant intermediate, grant Fulcio only signing access, and rehearse versioned rotation before the first real certificate is issued.
