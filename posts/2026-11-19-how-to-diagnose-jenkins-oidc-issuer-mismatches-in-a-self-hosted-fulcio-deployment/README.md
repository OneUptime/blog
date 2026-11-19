# How to Diagnose Jenkins OIDC Issuer Mismatches in a Self-Hosted Fulcio Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OIDC, Jenkins, Troubleshooting

Description: Compare Jenkins token, discovery, and Fulcio issuer URLs precisely, including folder-scoped and externally hosted issuers, before changing signing policy.

---

A Jenkins controller URL is not necessarily its OIDC issuer URL. The OIDC Provider plugin can issue tokens from a credential-specific URL, including a folder context, or use an externally hosted issuer. Configuring Fulcio with the controller's homepage can therefore fail even when Jenkins is reachable and the token has the right audience.

Start by writing down three exact strings: the token's `iss`, the discovery document's `issuer`, and the issuer configured in Fulcio. They must describe the same identity authority.

## Check the Jenkins plugin and credential

Jenkins has separate plugins for authenticating users to Jenkins and for issuing workload tokens from Jenkins. The [OIDC Provider plugin](https://plugins.jenkins.io/oidc-provider/) implements the latter. Its documentation explains how to obtain the generated issuer URI from the credential's update page and how an external issuer changes the token's `iss`.

Do not infer that URI from a job URL or reverse-proxy hostname. Record the actual credential ID used by the failing pipeline, its scope, configured audience, and issuer option. A credential at the root and one inside a folder may expose different issuer locations.

For an external issuer, verify that both discovery metadata and public keys were published from the current Jenkins credential. Updating or recreating that credential can rotate its key pair; stale hosted JWKS is then a different failure from an issuer mismatch.

## Compare exact identifiers locally

Inspect the token privately and save only its issuer value. Never print the raw token in a Jenkins console or paste it into a browser decoder. This small comparison can use manually copied, non-secret issuer values:

```python
import json

observed = {
    "token_iss": "https://jenkins.example.com/oidc",
    "discovery_issuer": "https://jenkins.example.com/oidc",
    "fulcio_issuer": "https://jenkins.example.com/oidc/",
}
for name, value in observed.items():
    print(name, json.dumps(value))
if len(set(observed.values())) != 1:
    raise SystemExit("Issuer identifiers differ")
```

The example intentionally fails because of the final slash. JSON string output also makes whitespace and escaped characters visible. Do not normalize away the difference in a verifier; correct the configuration at its source.

[OpenID Connect Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) requires consistency between the issuer identifier, discovery metadata, and token issuer. DNS equivalence does not make two issuer strings interchangeable.

## Fetch metadata through Fulcio's network path

Using the issuer published by Jenkins:

```bash
ISSUER='https://jenkins.example.com/oidc'
curl --fail --silent --show-error \
  --connect-timeout 5 --max-time 15 \
  "${ISSUER%/}/.well-known/openid-configuration" |
  jq '{issuer, jwks_uri}'
```

Run the equivalent probe from the Fulcio pod's network context. Check the original HTTP status before enabling redirect following. A login page, redirect to the controller homepage, or rewritten path suggests a reverse-proxy or anonymous-access problem.

If an internal CA signs the HTTPS certificate, use the intended trust store or Fulcio's supported issuer `ca-cert` configuration. An insecure TLS flag cannot establish that the response came from the trusted issuer. Keep the canonical issuer hostname even if split-horizon DNS sends the pod to a private address.

## Configure one reviewed issuer mapping

Use a fixed `oidc-issuers` entry for a fixed Jenkins issuer when possible. Its map key and `issuer-url` should use the exact discovered identifier; `client-id` must match the intended token audience. Choose an identity type and SAN mapping that your Jenkins token actually supports.

For a generic CI integration, `type: ci-provider` also needs matching `ci-provider` metadata and authoritative build claims. A token whose subject is merely a job URL may require a deliberate claim design before it supplies the build-signer and runner information you need. [Fulcio's OIDC integration guide](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md) describes those mapping requirements.

Do not widen a meta-issuer wildcard to hide a single misplaced path. Review exact matching and client behavior in the [configuration implementation](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go) for the deployed release.

## Separate the next failure from this one

After the issuer strings align, a signature error may reveal stale JWKS, an audience error may reveal the wrong Jenkins credential, and a template error may reveal missing CI claims. Those are useful new observations, not evidence that the issuer correction failed.

Finish with a fresh token, a canary artifact, and verification against the exact issued SAN and issuer. Test a neighboring Jenkins job and an unintended issuer as negative cases. Preserve the resulting issuer contract with the pipeline configuration so later proxy, credential, or folder changes receive the same compatibility test.
