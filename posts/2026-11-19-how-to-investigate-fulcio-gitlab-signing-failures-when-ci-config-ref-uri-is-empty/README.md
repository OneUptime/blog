# How to Investigate Fulcio GitLab Signing Failures When ci_config_ref_uri Is Empty

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, GitLab, OIDC, Troubleshooting

Description: Distinguish missing, null, and empty GitLab CI configuration claims in Fulcio failures, and repair the pipeline identity without fabricating certificate metadata.

---

A GitLab signing job can obtain a valid ID token and still fail when Fulcio builds its certificate. If the error mentions `ci_config_ref_uri`, inspect the pipeline configuration identity rather than rotating the OIDC key.

That claim identifies the top-level pipeline definition used by Fulcio's GitLab SAN and build-signer mapping. A missing or unusable value leaves Fulcio without the intended build identity.

## Understand the historical report and current contract

[Fulcio issue 2189](https://github.com/sigstore/fulcio/issues/2189) reported missing-claim template failures and was closed in March 2026 after a GitLab fix. Do not assume every current failure is that old bug, or that an issue's closure means every pipeline context now supplies a nonempty value.

The current [GitLab ID-token reference](https://docs.gitlab.com/ci/secrets/id_token_authentication/) still documents `ci_config_ref_uri` and `ci_config_sha` as null unless the pipeline definition is in the same project. Compare the documentation for your deployed GitLab version and the actual pipeline source. Fork and merge-request behavior deserves an explicit test rather than inference from an ordinary branch pipeline.

## Check presence and type without printing the token

Save the token privately with restrictive permissions and run this local diagnostic. It reports states and types instead of emitting the complete JWT or claim values:

```python
import base64
import json
from pathlib import Path

parts = Path("identity-token.jwt").read_text().strip().split(".")
if len(parts) != 3:
    raise SystemExit("Expected a compact signed JWT")
segment = parts[1] + "=" * (-len(parts[1]) % 4)
claims = json.loads(base64.urlsafe_b64decode(segment))

for name in ("ci_config_ref_uri", "ci_config_sha", "pipeline_source"):
    if name not in claims:
        state = "missing"
    elif claims[name] is None:
        state = "null"
    elif isinstance(claims[name], str) and not claims[name].strip():
        state = "empty string"
    elif isinstance(claims[name], str):
        state = "nonempty string"
    else:
        state = "unexpected type: " + type(claims[name]).__name__
    print(name + ": " + state)
```

This decodes untrusted data for diagnosis; it does not verify a token. Remove the temporary token afterwards, and keep any further identity details out of shared logs.

The distinctions matter. A missing key can produce a template lookup error. A null or empty value can fail differently depending on the release and mapping. Do not reduce all three cases to an issuer or audience failure.

## Follow the claim into the active template

The [upstream GitLab identity configuration](https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml) uses `ci_config_ref_uri` in the SAN and build-related URI extensions, with `ci_config_sha` providing the corresponding revision. Inspect the file actually loaded by your Fulcio deployment.

Check whether a private copy is outdated, whether a template references the right field, and whether its expected URI shape matches the claim. In the documented GitLab mapping, the template adds `https://`; a claim already containing that scheme would need investigation rather than blindly producing a doubled scheme.

Also inspect issuer, audience, and token expiry, but keep those results separate. A token can pass all standard OIDC checks and fail the later CI identity construction. [Fulcio's CI-provider implementation](https://github.com/sigstore/fulcio/blob/main/pkg/identity/ciprovider/principal.go) shows where claim templates are evaluated.

## Repair the pipeline identity at its source

Build a small reproduction with a top-level `.gitlab-ci.yml` in the same project, a simple branch pipeline, and the intended `id_tokens` audience. Compare its claim states with the failing pipeline. Hold the Fulcio version and configuration constant during that comparison.

Then change one dimension at a time: external pipeline definition, parent/child relationship, merge-request context, or source/target project. Record GitLab version, pipeline source, and configuration location for each case.

If the failure matches a fixed GitLab defect, qualify the relevant upgrade and obtain a new token. An old token does not change after the server upgrade. If the pipeline intentionally uses a context with null claims, choose a supported signing workflow or design a reviewed private identity mapping with authoritative inputs.

Do not fill a missing configuration URI with a constant approved workflow, a repository-controlled variable, or the job's self-reported URL. That can turn an identity-construction failure into a certificate falsely naming trusted build instructions.

## Verify the resulting certificate, not just the exit code

After repair, inspect the SAN, build-signer URI and digest, and source repository metadata. Verify the canary artifact using the intended private or public trust domain and an exact issuer/identity policy.

Repeat the problematic pipeline context and a neighboring unapproved context. A safe outcome may be deliberate refusal to sign an ambiguous pipeline. Document that decision so future changes do not quietly replace missing provenance with permissive defaults.
