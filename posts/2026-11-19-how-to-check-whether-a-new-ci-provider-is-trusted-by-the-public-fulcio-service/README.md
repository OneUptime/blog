# How to Check Whether a New CI Provider Is Trusted by the Public Fulcio Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OIDC, CI/CD, Cosign

Description: Check the public Fulcio configuration, issuer contract, and provider onboarding status before wiring a new CI platform into keyless signing.

---

A CI platform issuing OIDC tokens does not automatically make those tokens acceptable to the public Fulcio service. The provider must be admitted to that deployment, the token must target its configured audience, and Fulcio must know how to turn its claims into a certificate identity.

Check those conditions before debugging registry credentials. Registry authentication determines whether a signature can be stored; it does not determine whether Fulcio trusts the CI issuer.

## Ask the service you will actually use

Save the public configuration response with a timestamp:

```bash
curl --fail --silent --show-error \
  https://fulcio.sigstore.dev/api/v2/configuration \
  > fulcio-configuration.json

jq '.issuers[] | {
  issuerUrl,
  wildcardIssuerUrl,
  audience,
  issuerType,
  challengeClaim
}' fulcio-configuration.json
```

Fulcio exposes both fixed and wildcard issuer forms. An absent `issuerUrl` in one row may mean it is a wildcard entry, not that the response is broken. Compare the provider's exact documented issuer with the relevant configured form. Treat wildcard matching as an implementation rule; a text substring match is not a sufficient trust decision. [Fulcio's configuration source](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go) defines this response and issuer selection.

A successful configuration fetch is evidence about that endpoint at that time. It is not an issuance test. Keep public production, staging, and private Fulcio endpoints separate in your notes.

## Compare the token contract

Inspect a fresh token privately using a local decoder or trusted diagnostic tool. Do not paste it into a website or publish it in an issue. Record redacted values or field names for:

- `iss`: the exact issuer identifier;
- `aud`: the configured Fulcio audience, normally `sigstore`;
- expiration and other required time claims;
- the workflow identity and immutable revision claims;
- runner-environment information; and
- the claims referenced by the provider's SAN and extension templates.

Decoding does not authenticate the token. Fulcio must validate the signature using the issuer's keys before trusting these values.

The [OIDC integration guide](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md) explains the `ci-provider` mapping and why its provider name must match the corresponding metadata entry. Two CI products with similar APIs can still use incompatible identity semantics. Copying GitHub's templates into a different provider configuration is not proof that repository ownership, runner identity, or reusable workflows mean the same thing.

## Distinguish a request from deployed support

Search the upstream provider issue and associated configuration changes. Check whether the change was merged, which deployment it targets, and whether the live service now advertises it.

For example, the [Codeberg Actions onboarding issue](https://github.com/sigstore/fulcio/issues/2442) describes a CI system that could obtain an OIDC token while the public Fulcio instance did not yet trust its issuer. The useful lesson is the missing trust configuration; the issue's historical state should not replace a fresh service check.

Keep these states distinct:

| Evidence | What it establishes |
| --- | --- |
| Provider can mint a JWT | Token issuance works |
| Discovery and JWKS are reachable | Verification metadata is available |
| An onboarding issue exists | Support has been requested |
| A mapping is merged upstream | Source configuration has changed |
| Public endpoint advertises the issuer | That deployment exposes support |
| Canary issuance and verification pass | Your concrete workflow works end to end |

## Prepare a useful onboarding request

The public-good service has admission requirements beyond JWT syntax. Its [new identity-provider requirements](https://github.com/sigstore/fulcio/blob/main/docs/new-idp-requirements.md) cover discovery, protected signing keys, subject-reuse prevention, configurable audience, reliability, and a maintainer contact. Providers should open an issue before a configuration pull request.

Bring an issuer contract, documented key lifecycle, redacted claim examples, and a proposed stable SAN. Explain how one tenant cannot claim another tenant's identity and what happens after a repository or account is deleted and recreated. Provide a maintenance contact and a test plan for negative cases.

Do not send live tokens as sample data. A sanitized schema plus a synthetic identity is usually more useful than a credential that expires before a maintainer reads the request.

## Finish with an identity-specific canary

Once support is present, sign a harmless artifact from the intended CI job. Inspect the issued SAN and issuer, then verify with exact expected values. Also verify that a neighboring repository or unapproved workflow fails the policy.

If the public instance does not support the provider, choose an explicit alternative: an organization-managed private Sigstore deployment or another reviewed signing design. A client flag cannot authorize a new issuer at somebody else's CA. Keep the provider support decision visible so later failures are not misdiagnosed as flaky CI or registry access.
