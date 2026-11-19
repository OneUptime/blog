# How to Check Organization Restrictions Before Trusting GitHub Actions in a Private Fulcio CA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OIDC, CI/CD, Security

Description: Determine whether a private Fulcio deployment actually restricts GitHub organizations, then test issuance controls and artifact verification as separate policies.

Trusting GitHub's OIDC issuer establishes who signed a workflow token. It does not, by itself, mean that only your organization can obtain a certificate from your private Fulcio service. Treat organization restrictions as a property you must demonstrate with configuration and negative tests.

Fulcio's [organization restriction enhancement request](https://github.com/sigstore/fulcio/issues/1989) describes this exact gap. The request asks for certificate issuance to depend on claim values such as `repository_owner`. An issue proposing a feature is not evidence that the feature exists in the binary you deployed.

## Inventory the policy boundary

Write down three separate decisions:

1. Which OIDC issuer and audience may request a certificate?
2. Which authenticated callers may reach your private issuance endpoint?
3. Which certificate identities may authorize an artifact for release?

A private DNS name only addresses reachability. A trusted issuer only addresses identity authenticity. Your release verifier still needs an identity policy even when access to the certificate authority is restricted.

Review the configuration schema for your exact Fulcio version. The [upstream configuration types](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go) distinguish issuer selection, client audience, identity types, and certificate templates. A template that copies an organization claim into a certificate is not automatically an allowlist that rejects other organizations. Do not add an attractive-looking `allowed-organizations` field unless your release explicitly implements it.

## Collect the claims that identify your organization

GitHub's [OIDC reference](https://docs.github.com/en/actions/reference/security/oidc) documents `repository_owner`, `repository_owner_id`, repository identity, and workflow-related claims. The name and immutable identifier serve different purposes. A policy intended to survive organization renames should explicitly decide how to handle both.

Decode test tokens locally for inspection and keep them out of logs and tickets. Decoding a payload does not verify its signature. A gateway that makes authorization decisions must validate the token's signature, issuer, audience, and validity period before evaluating claim conditions. It must not trust a caller-supplied header that merely repeats an organization name.

Use a small policy worksheet before implementing controls:

```yaml
# Design worksheet, not Fulcio configuration.
issuer: https://token.actions.githubusercontent.com
organization:
  expected_name: example-org
  expected_id: "12345678"
release_identity:
  workflow: https://github.com/example-org/service/.github/workflows/release.yml@refs/heads/main
tests:
  approved_repository: allow
  outside_organization: deny
  missing_owner_id: deny
  wrong_audience: deny
```

Replace the illustrative organization ID with your actual identifier. Keeping this as a worksheet avoids confusing a proposed policy with a supported server setting.

## Test issuance and verification separately

Create controlled workflows in an approved repository and a repository outside the permitted organization. Use fresh tokens with the same intended audience. Run both against a staging copy of the private CA, preserving only redacted outcomes and request identifiers.

If both obtain certificates, you have demonstrated that the current issuance boundary is broader than the intended organization restriction. A subsequent verifier rejection does not change that result. Conversely, an ingress denial does not prove that Fulcio itself understands organization claims.

Exercise the real ingress path and any internal path that can reach the service. If authorization is enforced by a gateway, bypass access must be prevented or equivalently checked. Keep the identity proof that Fulcio consumes consistent with the identity on which the gateway based its decision.

When the deployed release has no suitable issuance policy, options include a carefully implemented authenticating gateway, an identity provider that only issues the permitted identities, or a different deployment boundary. Each option changes the trust design and needs its own end-to-end test. Selecting an option is an architectural decision, not a YAML spelling correction.

## Keep artifact acceptance narrow

Cosign supports checking a certificate's expected identity and OIDC issuer during verification. Follow the [verification documentation](https://docs.sigstore.dev/cosign/verifying/verify/) for the artifact format and client version in use. Prefer an exact release workflow identity when that is your policy; a regular expression matching every repository in an organization grants more authority.

Test an approved workflow, a different workflow in the same organization, an outside organization, and a changed repository or owner identifier. Preserve the expected and observed decision for each. If your policy depends on certificate extensions beyond the standard identity flags, confirm that the actual admission or verification component evaluates them.

The final evidence should explain where the organization restriction is enforced, which authenticated claim it checks, and whether a direct request can bypass it. That is a stronger operational guarantee than assuming that a private CA inherits restrictions from the GitHub organization that happens to operate it.
