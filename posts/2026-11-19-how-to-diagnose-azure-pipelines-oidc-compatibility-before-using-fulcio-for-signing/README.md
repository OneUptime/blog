# Diagnose Azure Pipelines OIDC Compatibility Before Signing with Fulcio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OIDC, Azure DevOps, CI/CD

Description: Check Azure Pipelines token type, issuer, audience, and CI identity claims before assuming its workload federation tokens can request Fulcio certificates.

---

Azure Pipelines can obtain workload identity tokens for cloud authentication, but that does not establish compatibility with Fulcio. Before building a signing pipeline, check which token is produced, which issuer signed it, which audience it targets, and whether your Fulcio deployment supports that provider's identity mapping.

A successful Azure login answers a different question from successful certificate issuance. Treat them as separate integration tests.

## Identify the token flow first

Microsoft documents an Azure DevOps OIDC-token creation API with an optional service-connection identifier. Its response carries an `oidcToken`; the API contract does not promise that callers can set an arbitrary audience parameter. [The OIDC token API reference](https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/oidctoken/create?view=azure-devops-rest-7.1) is the starting point for the actual request shape.

Do not substitute an Azure access token returned by a later exchange, a personal access token, or `System.AccessToken` for the original OIDC identity token. Each credential serves a different protocol role.

The [upstream Azure Pipelines integration issue](https://github.com/sigstore/fulcio/issues/1803) includes a historical token with audience `api://AzureADTokenExchange` and issuer under `vstoken.dev.azure.com`. That example describes the reported flow; it is not a universal claim about every current Azure Pipelines token.

Microsoft also documents a newer issuer form for newly created workload-identity service connections under `login.microsoftonline.com`. Existing and new connection types can therefore differ. Use the values from your actual flow and the matching [Microsoft troubleshooting guidance](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/troubleshoot-workload-identity?view=azure-devops).

## Inspect only the fields needed for diagnosis

For a privately saved token file with restrictive permissions, this script prints selected fields without printing the bearer token. Run it locally, not in a public CI log:

```python
import base64
import json
from pathlib import Path

encoded = Path("identity-token.jwt").read_text().strip()
parts = encoded.split(".")
if len(parts) != 3:
    raise SystemExit("Expected a compact signed JWT")
payload = parts[1] + "=" * (-len(parts[1]) % 4)
claims = json.loads(base64.urlsafe_b64decode(payload))
for name in ("iss", "aud", "sub", "iat", "exp", "nbf"):
    print(name, json.dumps(claims.get(name)))
```

The output still contains identity metadata. Redact it before sharing, delete the temporary token when finished, and remember that decoding does not verify its signature.

Record the pipeline task version, service-connection type, token API version, and token field names alongside the result. Otherwise, two developers may compare tokens from different flows and conclude that one of them is malformed.

## Compare with Fulcio's active contract

Read the configuration from the Fulcio deployment you intend to use:

```bash
curl --fail --silent --show-error \
  https://fulcio.sigstore.dev/api/v2/configuration |
  jq '.issuers'
```

Check the issuer entry, expected audience, and identity type. The endpoint does not expose the full SAN and certificate-extension claim mappings; review those in the deployment's provider configuration or implementation. A token containing `api://AzureADTokenExchange` will not satisfy an issuer entry expecting `sigstore` unless the appropriate supported audience is present. Editing the decoded JSON breaks the token signature; renaming an environment variable does not change its audience.

A private operator can choose a different client ID, but that changes the accepted credential contract. Review whether a token intended for another relying party should authorize signing at all. Keep the audience intentionally scoped to the selected trust design. [Fulcio's OIDC guide](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md) describes issuer and CI-provider integration requirements.

## Verify the CI identity mapping

Even a trusted issuer and accepted audience are insufficient if the provider cannot supply authoritative build identity. Review how the SAN names the signing instructions, whether repository and workflow revisions are immutable, and how hosted versus self-hosted execution is represented.

Do not invent missing claims from pipeline variables controlled by untrusted repository code. Fulcio's certificate attributes must come from the authenticated token and a reviewed mapping. A broad service-connection subject may identify permission to exchange credentials without identifying the exact build instructions your release verifier needs.

For public service onboarding, [Sigstore's provider requirements](https://github.com/sigstore/fulcio/blob/main/docs/new-idp-requirements.md) also require a configurable `sigstore` audience and protections against identity reuse. A successful private experiment does not establish acceptance by the public service.

## Use a small compatibility matrix

Test acquisition, discovery/JWKS access, Fulcio token acceptance, certificate identity, artifact signing, and final verification separately. Record the first failing stage and its sanitized error.

A valid test artifact must pass an exact issuer/SAN policy. A token with the wrong audience and an identity from an unapproved pipeline must fail their respective checks. If the token flow or provider mapping cannot meet the contract, stop treating the integration as a configuration typo and select a supported signing design. That decision is easier to make before release automation depends on it.
