# How to Test a Custom OIDC Client Audience Across Sigstore Python and Fulcio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OIDC, Python, Troubleshooting

Description: Test that your private OIDC audience agrees across the identity provider, sigstore-python, and Fulcio, including local parsing and server-side rejection cases.

---

A custom audience works only when three components agree: the identity provider issues it, the signing client accepts it, and Fulcio expects it for that issuer. Changing only Fulcio's `client-id` can leave sigstore-python rejecting the token before any certificate request is sent.

The public Sigstore convention remains `sigstore`. Use a custom audience for an intentionally configured private deployment, and test every client that will participate.

## Record the version and active contract

Start with the installed Python package and command help:

```bash
python -m sigstore --version
python -m sigstore sign --help
```

The current CLI documents `--oidc-client-id`, while older versions had a hardcoded local audience check discussed in [issue 1401](https://github.com/sigstore/sigstore-python/issues/1401). Do not diagnose your installed package from an old issue alone.

Check the private Fulcio configuration endpoint and record the issuer's audience. Its configured `client-id` drives the expected audience. Also inspect the real token's `aud`, which can be a string or an array, without publishing the bearer token. [Fulcio's OIDC guide](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md) describes the token contract.

Use a table in the integration record:

| Component | Example value |
| --- | --- |
| OIDC client/token audience | `company-signing` |
| Python client ID | `company-signing` |
| Fulcio issuer client ID | `company-signing` |
| Expected issuer | `https://id.example.com` |

The values are illustrative; they are not settings for the public service.

## Test the local wrapper independently

Current sigstore-python exposes `IdentityToken(raw_token, client_id=...)`. Its local checks include required claims, audience, and time, but intentionally do not verify the JWT signature; Fulcio performs the identity authentication. [The official implementation](https://github.com/sigstore/sigstore-python/blob/main/sigstore/oidc.py) documents this boundary.

The following offline fixture tests local audience handling. Its fake signature is deliberate and must never be sent to Fulcio:

```python
import base64
import json
import time

from sigstore.oidc import IdentityError, IdentityToken


def encode(value):
    raw = json.dumps(value, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


now = int(time.time())
claims = {
    "iss": "https://id.example.com",
    "sub": "synthetic-builder",
    "aud": "company-signing",
    "iat": now,
    "exp": now + 300,
}
token = ".".join([
    encode({"alg": "RS256", "typ": "JWT"}),
    encode(claims),
    base64.urlsafe_b64encode(b"not-a-real-signature").rstrip(b"=").decode(),
])

IdentityToken(token, client_id="company-signing")
try:
    IdentityToken(token, client_id="different-audience")
except IdentityError:
    print("Expected audience accepted; wrong audience rejected locally")
else:
    raise AssertionError("Wrong audience unexpectedly accepted")
```

Run this with the exact package version in the signing environment. Passing proves only that the local wrapper uses the selected audience. It proves neither authentic identity nor server compatibility. A `TypeError` for `client_id` identifies an incompatible API version before you spend time on network diagnosis.

## Exercise the intended acquisition path

For an interactive private issuer, current CLI configuration can look like:

```bash
python -m sigstore --trust-config private-client-trust.json sign \
  --oidc-disable-ambient-providers \
  --oidc-issuer https://id.example.com \
  --oidc-client-id company-signing \
  canary.txt
```

Use an authenticated client trust configuration prepared for your private Sigstore instance. It is not an arbitrary Fulcio PEM file. Confirm the options against [the current project CLI reference](https://github.com/sigstore/sigstore-python).

Disabling ambient providers makes this test exercise the specified interactive issuer rather than silently selecting a CI token. Test ambient CI acquisition separately: an SDK option cannot make a provider issue an audience it does not support. Avoid command-line token values in shared environments where process inspection could expose them.

## Test Fulcio and verification separately

Obtain a real short-lived token from your trusted issuer and sign a harmless artifact. Verify the resulting bundle with the private trust configuration and exact identity policy. Then test a genuine token minted for a different audience and confirm Fulcio refuses it.

Record where rejection occurred: client parsing, discovery, server audience validation, identity mapping, or artifact verification. Changing the client ID does not repair missing CI claims or a mismatched proof-of-possession challenge.

Keep the synthetic parser fixture and the real canary as separate checks. Together they show that local client behavior and the actual private trust domain agree, without treating an unverified decoded token as proof of a valid signing identity.
