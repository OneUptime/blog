# Why Fulcio Rejects an OIDC Token: Debugging iss, aud, sub, exp, and nbf Claims

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OIDC, JWT, Cosign, Authentication, Troubleshooting

Description: Diagnose Fulcio OIDC failures systematically by checking discovery, JWT signatures, exact issuer and audience values, identity claims, token timing, and proof of possession without leaking tokens.

---

Fulcio token errors are easiest to solve when you separate five questions: who issued the token, who it was issued for, which principal it represents, whether it is valid now, and whether the certificate requester controls the submitted private key.

The claims `iss`, `aud`, `sub`, `exp`, and optional `nbf` answer only part of those questions. Provider-specific claims and the token's cryptographic signature matter too. Decoding a JWT is useful for diagnosis, but decoded JSON is not evidence that the token is authentic.

## Inspect Without Leaking the Token

OIDC ID tokens are bearer credentials. Do not paste one into a web-based JWT decoder, print it in a CI log, add it to a bug report, or pass it on a command line that another local process can inspect.

To view the header and payload locally, read the token from standard input and perform Base64URL decoding:

```bash
printf '%s' "$SIGSTORE_ID_TOKEN" | python3 -c '
import base64, json, sys
token = sys.stdin.read().strip()
parts = token.split(".")
if len(parts) != 3:
    raise SystemExit("not a compact JWS")
for label, part in zip(("header", "payload"), parts[:2]):
    part += "=" * (-len(part) % 4)
    value = json.loads(base64.urlsafe_b64decode(part))
    print(label + ":")
    print(json.dumps(value, indent=2, sort_keys=True))
'
```

Unset the variable when finished. Treat every value as untrusted until the issuer signature and validation rules have passed.

## Check `iss`: Exact Issuer and Discovery

The token's `iss` selects the configured Fulcio issuer and the OIDC discovery metadata used to verify it. Small differences are meaningful:

```text
https://id.example.com
https://id.example.com/
https://id.example.com/tenant-a
```

Do not assume Fulcio removes a slash or path. Compare the token value with the configured `oidc-issuers` entry and its `issuer-url`. Then retrieve discovery metadata from the token issuer:

```bash
OIDC_ISSUER='https://id.example.com'

curl --fail --silent --show-error \
  "$OIDC_ISSUER/.well-known/openid-configuration" |
  jq '{issuer, jwks_uri, id_token_signing_alg_values_supported}'
```

The discovery document's `issuer` must agree with the issuer being verified. Confirm Fulcio can reach the discovery and JWKS URLs, resolve DNS, validate their TLS chains, and traverse any required proxy. For an internal issuer signed by a private TLS CA, configure Fulcio's supported `ca-cert`; do not use an insecure TLS bypass.

Federated email issuers are a special case. A Fulcio configuration can use `issuer-claim` to take the identity-provider issuer from another JSON claim. When debugging, distinguish the JWT issuer used for signature verification from the issuer identity ultimately written to the certificate.

## Check `aud`: It Must Target Fulcio

Fulcio's official configuration convention uses `client-id: sigstore`, so the token's audience must contain `sigstore`. OIDC permits `aud` to be a string or an array:

```json
{"aud": "sigstore"}
```

```json
{"aud": ["sigstore", "another-client"]}
```

A token for a cloud API, registry, or default GitHub organization audience is not interchangeable with a Fulcio token. GitHub Actions uses the repository owner's URL as its default audience unless the requester asks for another one. Cosign's GitHub provider requests the `sigstore` audience automatically; custom code must do so explicitly, for example with `core.getIDToken('sigstore')`.

If a private Fulcio deployment uses another `client-id`, both the OIDC token request and Fulcio configuration must use that exact value. Changing the client ID is a trust-domain decision, not a client-side workaround.

## Check `sub`: Principal, Challenge, or Metadata

`sub` is the issuer-scoped subject. It must be present for the provider types that use it, but it is not always copied into the certificate SAN.

- For a generic URI or SPIFFE issuer, `sub` becomes the URI identity after domain checks.
- For GitHub Actions, the certificate SAN is derived from `job_workflow_ref`, while the raw `sub` is preserved in Fulcio OID `1.3.6.1.4.1.57264.1.24` in current certificates.
- For an email issuer, the verified `email` claim becomes the SAN and is normally the proof-of-possession challenge.
- For Kubernetes, nested `kubernetes.io` claims determine the service-account SAN.

The default proof-of-possession challenge is `sub` for most non-email identities. If the client signs a different value, or signs with a key other than the one submitted to Fulcio, a perfectly valid JWT will still be rejected. Check the Fulcio configuration endpoint for the issuer's advertised challenge claim before constructing a low-level request.

For GitHub, also remember that the default `sub` changes shape according to job context. It can include a branch, pull request, tag, or environment. GitHub.com repositories created after July 15, 2026 use the immutable default format containing owner and repository IDs; older repositories keep the previous format unless they opt in, and renames or transfers after that date also move to the immutable format. This rollout does not apply to GitHub Enterprise Server. A customized GitHub `sub` template affects the raw token subject, but it does not rewrite Fulcio's documented `job_workflow_ref` SAN mapping.

## Check `exp`, `iat`, and `nbf` Against the Server Clock

Fulcio requires `exp` and `iat`; `nbf` is optional. Read them as Unix seconds and compare them with the clock on the Fulcio server, not just the developer laptop:

```bash
date -u +%s
date -u -r 1787652300 2>/dev/null || date -u -d @1787652300
```

Interpret the claims as follows:

- `exp`: the token must not be expired when Fulcio validates it;
- `nbf`: when present, the current verifier dependency allows five minutes of clock-skew leeway before rejecting a token as too early; and
- `iat`: Fulcio's documented token contract requires the claim, but the current verifier records it without applying an issuance-age or future-time cutoff.

Keep tokens compliant with the documented contract and clocks synchronized; do not treat the current `iat` behavior or `nbf` leeway as a security policy that every release will preserve.

Synchronize runners, Fulcio nodes, and the identity provider with reliable time sources. Fetch the token immediately before signing rather than caching it across a queued job. A retry should request a fresh token; repeatedly sending an expired token cannot succeed.

Do not “fix” timing errors by making tokens long-lived. Short validity reduces the useful window for a captured bearer token.

## Verify the JWS Header and Issuer Keys

Inspect the JWT header for `kid` and `alg`. The issuer's `jwks_uri` must expose the referenced key, and the algorithm must be accepted by the OIDC verifier. Common operational failures include:

- the issuer rotated keys but Fulcio cannot refresh JWKS;
- an internal cache serves stale discovery or keys;
- the token is encrypted rather than a signed compact JWS;
- the token is an OAuth access token with the wrong issuer or audience; and
- a proxy modifies discovery responses or blocks egress.

Use an OIDC/JWT library to verify the signature against discovery metadata. Do not implement acceptance by merely selecting a JWK with `jq`, and never accept `alg: none`.

## Check Provider-Specific Required Claims

After standard validation, Fulcio constructs a provider-specific principal. A failure here can look like a token rejection even though `iss`, `aud`, and time are correct.

| Issuer type | Important additional inputs |
| --- | --- |
| email | `email`, `email_verified: true` unless an explicitly supported private configuration safely replaces that check |
| GitHub Actions | `job_workflow_ref` plus workflow, repository, ref, SHA, runner, and related CI claims used by the configured templates |
| SPIFFE | URI `sub` with a trust domain exactly matching `spiffe-trust-domain` |
| Kubernetes | nested namespace and service-account claims under `kubernetes.io` |
| generic CI provider | every token claim referenced by the configured SAN and extension templates |

Fulcio templates use missing-key errors. A renamed or omitted CI claim can therefore fail certificate construction even when basic OIDC verification succeeds. Version the issuer claim contract and test it before rolling out token changes.

## Use a Layered Failure Checklist

Work from the outside inward:

1. Can Fulcio reach the issuer's discovery URL and JWKS over trusted TLS?
2. Does the compact JWS have three parts, a recognized algorithm, and a known `kid`?
3. Does its signature validate with current issuer keys?
4. Does `iss` exactly select the intended configured issuer?
5. Does `aud` contain that issuer entry's `client-id`?
6. Are `exp`, `nbf`, and `iat` consistent with the Fulcio node's time?
7. Are provider-specific identity and template claims present and correctly typed?
8. Does the proof of possession use the advertised challenge and submitted key?

Also inspect Fulcio's `/api/v2/configuration` response and structured server logs. Log a request correlation ID, configured issuer name, and safe error classification—not the JWT, email, or full claims object.

## Official Documentation

- [Fulcio OIDC claim requirements and identity mappings](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md)
- [Sigstore OID claim mapping, including validation-only claims](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Fulcio identity configuration](https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml)
- [Fulcio configuration implementation](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go)
- [Fulcio's pinned OIDC verifier dependency](https://github.com/sigstore/fulcio/blob/main/go.mod)
- [Current OIDC verifier time checks](https://github.com/coreos/go-oidc/blob/v3.20.0/oidc/verify.go)
- [Fulcio proof-of-possession request flow](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md)
- [GitHub Actions OIDC reference](https://docs.github.com/en/actions/reference/security/oidc)

## Conclusion

Treat a rejected token as a pipeline of checks, not a single JWT mystery. Verify discovery and signature first, then exact issuer, intended audience, time window, provider-specific identity claims, and proof of possession—while keeping the bearer token out of every log and ticket.
