# Validation Summary: Check GitHub Actions Organization Restrictions in a Private Fulcio CA

## Status
validated

## Post Type
Technical security guide with a YAML policy-design worksheet and operational validation procedures.

## Technologies Covered
- Sigstore Fulcio and private certificate authorities
- GitHub Actions OpenID Connect (OIDC) tokens
- JWT validation and claim-based authorization
- Cosign artifact signature verification
- CI/CD identity policies and authenticating gateways
- YAML

## Sources Consulted
- Fulcio enhancement request #1989: https://github.com/sigstore/fulcio/issues/1989 — confirms the request for issuance restrictions based on claims such as repository_owner.
- Fulcio configuration types: https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go — checked issuer, client ID, identity type, and certificate-template settings.
- Fulcio identity configuration: https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml — checked GitHub Actions issuer configuration and CI identity mapping.
- Fulcio OIDC documentation: https://github.com/sigstore/fulcio/blob/main/docs/oidc.md — checked authentication and workflow identity representation.
- Fulcio certificate specification: https://github.com/sigstore/fulcio/blob/main/docs/certificate-specification.md — checked subject alternative names, OIDC issuer extensions, and additional token-derived certificate values.
- GitHub OpenID Connect reference: https://docs.github.com/en/actions/reference/security/oidc — checked the issuer URL, audience customization, owner and repository claims, workflow claims, and token validity claims.
- OpenID Connect Core 1.0, section 3.1.3.7: https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation — checked issuer, audience, signature, and expiration validation requirements.
- Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/ — checked certificate identity and OIDC issuer verification and artifact-specific verification guidance.

## Issues Found
No technical issues found.

## Review Notes
- The post contains substantive implementation guidance, so it qualifies for technical validation despite having no executable commands or application code.
- Inspected the YAML worksheet for syntax and meaning. Its indentation, mappings, quoted organization ID, and URL values are valid. Its fields are explicitly illustrative policy inputs, not supported Fulcio configuration keys.
- The referenced enhancement request supports the stated motivation. The post correctly avoids treating a feature request as proof that a deployed release implements organization restrictions.
- The inspected configuration separates issuer/audience selection from identity and certificate-template mapping. Copying claims into certificates does not itself establish an organization allowlist.
- GitHub documents the owner name, owner ID, repository identity, workflow references, audience, and validity claims discussed. The worksheet uses the correct GitHub Actions issuer and a plausible workflow certificate identity.
- The distinction between decoding and validating tokens is correct. The gateway guidance appropriately requires authenticated claims, consistent identity proofs, and prevention of bypass paths.
- Issuance success, ingress rejection, and artifact acceptance are separate outcomes. The proposed positive and negative tests correctly evaluate those boundaries independently.
- Cosign supports expected certificate identity and issuer checks. The post appropriately calls for explicit verifier support when policy also depends on other certificate extensions.
- The four technical links in the post resolved to their intended upstream resources. Example organization names, IDs, and workflow URLs are placeholders, not live deployment evidence.
- No specific Fulcio or Cosign release is claimed. Upstream main-branch references can change; the instruction to inspect the exact deployed version remains necessary. Reusable workflows and private certificate templates can affect the emitted identity, so operators must inspect actual issued certificates when applying the worksheet.
- This was a documentation and source review. No private CA, gateway, GitHub workflow, or artifact verification environment was supplied, so live issuance and verification tests were not performed. Missing-claim tests require controlled fixtures or an appropriate test issuer; editing a signed GitHub token would instead test signature rejection.
- README.md required no changes.
