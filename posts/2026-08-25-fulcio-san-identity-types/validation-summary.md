# Validation Summary: Email, URI, Kubernetes, and SPIFFE Identities in Fulcio: Which SAN Will Be Issued?

## Status

validated

## Post Type

Technical reference guide

## Technologies Covered

- Fulcio and Sigstore keyless certificate issuance
- OpenID Connect ID tokens and identity claims
- X.509 Subject Alternative Name forms and Fulcio private OIDs
- Kubernetes bound ServiceAccount tokens
- SPIFFE IDs and trust domains
- GitHub Actions and generic CI-provider identities
- Cosign blob verification and Sigstore TrustedRoot configuration
- OpenSSL certificate inspection

## Sources Consulted

- Fulcio OIDC identity mappings: https://github.com/sigstore/fulcio/blob/main/docs/oidc.md
- Fulcio configuration types and URI-domain validation: https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go
- Fulcio identity implementations for email, URI, Kubernetes, SPIFFE, username, and generic CI providers: https://github.com/sigstore/fulcio/tree/main/pkg/identity
- Fulcio public issuer and CI template configuration: https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml
- Fulcio OID directory and CI extension requirements: https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md
- Fulcio certificate specification: https://github.com/sigstore/fulcio/blob/main/docs/certificate-specification.md
- Fulcio architecture specification: https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md
- OpenID Connect Core 1.0, ID Token requirements: https://openid.net/specs/openid-connect-core-1_0.html#IDToken
- RFC 5280, Subject Alternative Name and empty-Subject requirements: https://www.rfc-editor.org/rfc/rfc5280.html#section-4.2.1.6
- Kubernetes ServiceAccount token claims: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- SPIFFE ID standard: https://github.com/spiffe/spiffe/blob/main/standards/SPIFFE-ID.md
- GitHub Actions OIDC claim reference: https://docs.github.com/en/actions/reference/security/oidc
- Cosign `verify-blob` command reference: https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-blob.md
- Cosign custom-component and TrustedRoot configuration: https://docs.sigstore.dev/cosign/system_config/custom_components/
- OpenSSL 3.6 `x509` command reference: https://docs.openssl.org/3.6/man1/openssl-x509/
- Cosign legacy-bundle verification advisory: https://github.com/sigstore/cosign/security/advisories/GHSA-fx35-mq7g-6g98

## Issues Found

### 1. Empty Subject claim was too broad

**What was wrong:** The introduction said all Fulcio certificates have an empty X.509 Subject, but Fulcio root and intermediate CA certificates have nonempty Subjects. The empty-Subject rule applies to issued leaf certificates.

**What was changed:** Qualified the statement as “Fulcio-issued leaf certificates.”

**Why:** This matches the Fulcio architecture specification and RFC 5280 profile for certificates whose identity appears only in a critical SAN.

### 2. Email ID Token omitted the required `sub` claim

**What was wrong:** The complete email token example omitted `sub`, which is required in every conforming OpenID Connect ID Token even though Fulcio maps the verified `email` claim to the email SAN.

**What was changed:** Added an opaque `"sub": "account-12345"` claim.

**Why:** The example is now OIDC-conformant and remains consistent with the explanation that an opaque subject does not replace the verified email SAN.

### 3. Kubernetes SAN inputs were imprecise

**What was wrong:** The table referred generally to namespace and service-account data, and the prose mentioned only the pod name and UID as excluded. Current Fulcio constructs this SAN from exactly `kubernetes.io.namespace` and `kubernetes.io.serviceaccount.name`; it does not include the pod fields or service-account UID.

**What was changed:** Named the two exact nested fields in the table and clarified which sample fields do not appear in the SAN.

**Why:** This matches the current Kubernetes principal implementation and prevents readers from treating UIDs as part of the certificate identity.

### 4. URI configuration validation needed exact scope

**What was wrong:** The URI section described Fulcio as constraining the issuer and subject domains without stating that the configuration-time implementation compares only the final two hostname labels. That comparison is not public-suffix-aware and is unsafe to interpret as an eTLD+1 check for suffixes such as `co.uk`.

**What was changed:** Described the final-two-label comparison and its public-suffix limitation explicitly.

**Why:** This reflects the current implementation and its source-code warning while preserving the separate exact scheme-and-hostname check applied to each token subject.

### 5. Private Sigstore verification omitted custom trust material

**What was wrong:** The Cosign example used a private example issuer but supplied only identity and issuer constraints. By default, Cosign trusts the public Sigstore deployment; those constraints do not establish trust in a private Fulcio CA, CT log, or transparency log.

**What was changed:** Added private-deployment context and `--trusted-root trusted-root.json` to the command.

**Why:** Current Cosign v3 verification requires the private deployment's trust material through a configured custom TUF root, a Sigstore TrustedRoot file, or another documented custom-component mechanism.

### 6. Conclusion overstated what the SAN encodes

**What was wrong:** The conclusion said Fulcio makes the issuer type explicit in the SAN. Multiple configured issuer types can produce the same URI GeneralName form; the SAN carries the mapped identifier, not a separate issuer-type tag.

**What was changed:** Reworded the sentence to say Fulcio represents the configured identity in the SAN.

**Why:** This preserves the intended summary without implying that a verifier can recover the Fulcio configuration type from the SAN alone.

## Review Notes

- Review was performed against Fulcio `main` commit `2a7ebbb7b5787335588a8f41c54a40ff4507f47c` from 2026-08-24 and the latest tagged release, v1.8.8. Targeted tests for configuration and all discussed identity implementations passed.
- Current Fulcio does not check the Kubernetes nested identity fields for nonempty values or cross-check them against `sub`; the trusted Kubernetes issuer is responsible for issuing internally consistent claims. The post does not claim otherwise.
- Fulcio's repository-local `docs/certificate-specification.md` still lists only email and URI SANs and the deprecated issuer OID `.1.1`. The current architecture specification includes username `otherName` SANs and recommends issuer OID `.1.8`; the corrected post follows the architecture specification and implementation.
- Cosign 2.6.5 or 3.1.3 and later should be used when accepting legacy JSON bundles. Earlier versions could bypass certificate identity and issuer enforcement for that legacy format; standardized protobuf bundles were not affected.
- All links in the post's Official Documentation section resolved successfully during review.
