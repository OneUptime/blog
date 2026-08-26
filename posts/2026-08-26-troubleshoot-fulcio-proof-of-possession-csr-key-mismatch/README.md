# How to Troubleshoot Fulcio Proof-of-Possession Failures and CSR Key Mismatches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, Proof of Possession, CSR, Cosign, OIDC, Certificate Troubleshooting

Description: Debug Fulcio v2 public-key challenges and PKCS#10 requests by pinning the exact identity claim, key, encoding, hash algorithm, and post-issuance artifact signer.

---

Fulcio will issue a certificate only after authenticating the OIDC token and proving that the caller controls the private key corresponding to the public key placed in the leaf. The v2 API offers two mutually exclusive proof paths:

- a public key plus a signature over the configured identity challenge; or
- a PKCS#10 CSR whose self-signature proves possession of its embedded public key.

Both paths can produce Fulcio's generic client message, `The signature supplied in the request could not be verified`. Debug them by preserving one request's token, keypair, exact challenge bytes, and serialized body as a single unit. Regenerating one component between checks creates a new mismatch.

## Locate the Failing Stage

Current Fulcio processes a request in this order:

1. authenticate and map the OIDC token to an identity principal;
2. parse the CSR or public key;
3. apply Sigstore key-strength validation;
4. verify the CSR self-signature or explicit proof of possession;
5. check the public-key/hash combination against `--client-signing-algorithms`; and
6. ask the CA/CT backends to issue and log the certificate.

The public error identifies the broad stage:

| Message | First place to look |
| --- | --- |
| `There was an error processing the identity token` | issuer, audience, signature, expiry, claims, OIDC discovery |
| `The public key supplied in the request could not be parsed` | PEM/DER content and JSON field shape |
| `The certificate signing request could not be parsed` | PKCS#10 PEM and base64 JSON encoding |
| `The public key supplied in the request is insecure` | curve, RSA size/exponent/weak primes, supported key type |
| `The signature supplied in the request could not be verified` | challenge bytes/key pair or CSR self-signature |
| `signing algorithm not permitted` | server algorithm allowlist and selected hash/signature algorithm |

Token authentication happens first. Do not debug a proof while the server is rejecting the token. Fulcio operator logs contain the underlying error with the generic client message; correlate a test request using safe request metadata without logging the bearer token or private key.

## Read the Server's Advertised Challenge

Query the v2 configuration endpoint:

```bash
curl --fail --silent --show-error \
  https://fulcio.example.com/api/v2/configuration |
  jq '.issuers[] | {
    issuerUrl,
    wildcardIssuerUrl,
    audience,
    challengeClaim,
    issuerType
  }'
```

Select the issuer whose URL exactly matches the token's `iss`. The `challengeClaim` tells clients which token claim is intended for proof of possession. Current built-in defaults are:

- `email` for an email issuer; and
- `sub` for GitHub, GitLab, CI provider, Kubernetes, SPIFFE, URI, username, Buildkite, and the other built-in workload types.

This is why blindly signing the JWT `sub` fails for a verified-email issuer: current Fulcio verifies the signature over the mapped email identity.

The protobuf comment still summarizes the proof as a signature over `sub`, while the configuration API supports a release/configuration-specific challenge claim. Trust the endpoint for client behavior and run a positive integration test for any custom `challenge-claim`; current server verification ultimately uses the identity implementation's `principal.Name`, so a custom mapping must be proven against the exact release.

## Preserve the Exact Challenge Bytes

Decode the token locally with a trusted JWT tool and extract the advertised claim. Do not paste production tokens into web decoders or CI logs.

Set the value without adding whitespace:

```bash
CHALLENGE='builder@example.com'

printf '%s' "$CHALLENGE" | od -An -tx1
```

Common byte mismatches are:

- a trailing newline from `echo`;
- surrounding JSON quotes;
- signing base64url-encoded JWT payload bytes instead of the claim value;
- Unicode normalization differences;
- using `sub` when `email` is advertised;
- case-folding or trimming a value that Fulcio does not transform; and
- refreshing the ID token after signing a challenge whose value changed.

Use one fresh ID token and its exact claim for the request. Never log `ID_TOKEN` while debugging.

## Prove the Public Key Matches the Private Key

For an ECDSA or RSA key:

```bash
openssl pkey \
  -in leaf-private.pem \
  -pubout \
  -out leaf-public.pem

openssl pkey \
  -in leaf-private.pem \
  -pubout \
  -outform DER |
  openssl dgst -sha256

openssl pkey \
  -pubin \
  -in leaf-public.pem \
  -outform DER |
  openssl dgst -sha256
```

The SPKI digests must match. Avoid comparing PEM text because line endings and wrapping can differ while DER is identical.

A frequent client bug generates an ephemeral key for the public key, then calls a signing helper that generates another key. Keep one key object alive through public-key serialization, proof creation, certificate receipt, and artifact signing.

## Sign the Explicit Proof with the Correct Algorithm

Current Fulcio infers the algorithm from the submitted key; the `PublicKeyAlgorithm` enum is ignored. Its `RSA_PSS` enum name is retained for compatibility but current behavior treats RSA proofs as PKCS#1 v1.5, not RSA-PSS.

For a P-256 client key:

```bash
printf '%s' "$CHALLENGE" |
  openssl dgst -sha256 \
    -sign leaf-private.pem \
    -out proof.sig

openssl dgst -sha256 \
  -verify leaf-public.pem \
  -signature proof.sig \
  < <(printf '%s' "$CHALLENGE")
```

Current default proof hashes are SHA-256 for P-256 and RSA, SHA-384 for P-384, SHA-512 for P-521, and the native pure mode for Ed25519. An older client that always used SHA-256 can fail against a newer Fulcio for P-384/P-521. Pin compatible client/server versions and test the selected algorithm.

The local OpenSSL verification must say `Verified OK` before sending anything. If it fails locally, Fulcio is not the cause.

## Serialize the v2 Public-Key Request Correctly

Protobuf `bytes` fields are base64 strings in JSON. The public-key `content` field is a normal string containing PEM or raw DER represented according to the client interface; PEM is easiest for JSON.

```bash
PUBLIC_KEY=$(< leaf-public.pem)
PROOF_B64=$(base64 < proof.sig | tr -d '\n')

jq -n \
  --arg token "$ID_TOKEN" \
  --arg publicKey "$PUBLIC_KEY" \
  --arg proof "$PROOF_B64" \
  '{
    credentials: {oidcIdentityToken: $token},
    publicKeyRequest: {
      publicKey: {content: $publicKey},
      proofOfPossession: $proof
    }
  }' > request.json

curl --fail-with-body \
  -H 'Content-Type: application/json' \
  --data-binary @request.json \
  https://fulcio.example.com/api/v2/signingCert \
  > response.json
```

Do not place a base64-encoded PEM string in `content`; that would make Fulcio parse the base64 characters as if they were PEM/DER. Conversely, do not place raw binary signature bytes directly in `proofOfPossession`; JSON protobuf encoding requires base64.

Destroy `request.json` promptly because it contains the bearer token.

## Validate the CSR Path Independently

Create a CSR with the same key that will sign the artifact:

```bash
openssl req \
  -new \
  -key leaf-private.pem \
  -subj / \
  -out leaf.csr.pem

openssl req \
  -in leaf.csr.pem \
  -noout \
  -verify \
  -text
```

Fulcio uses the CSR's embedded public key and verifies its PKCS#10 self-signature. It ignores the CSR Subject and all requested SAN fields; certificate identity comes from the authenticated OIDC token. Adding an email or workflow SAN to the CSR will not override the token mapping.

Compare the CSR key to the private key:

```bash
openssl req -in leaf.csr.pem -pubkey -noout |
  openssl pkey -pubin -outform DER |
  openssl dgst -sha256

openssl pkey -in leaf-private.pem -pubout -outform DER |
  openssl dgst -sha256
```

If `openssl req -verify` fails, the CSR was corrupted, re-encoded incorrectly, or created by a custom implementation that signed with a different key/algorithm. Fulcio correctly rejects it.

## Serialize the CSR as Protobuf Bytes

The CSR is also a `bytes` field, so base64-encode the entire PEM document for the JSON gateway:

```bash
CSR_B64=$(base64 < leaf.csr.pem | tr -d '\n')

jq -n \
  --arg token "$ID_TOKEN" \
  --arg csr "$CSR_B64" \
  '{
    credentials: {oidcIdentityToken: $token},
    certificateSigningRequest: $csr
  }' > csr-request.json

curl --fail-with-body \
  -H 'Content-Type: application/json' \
  --data-binary @csr-request.json \
  https://fulcio.example.com/api/v2/signingCert \
  > response.json
```

Send either `publicKeyRequest` or `certificateSigningRequest`, never both. They are a protobuf `oneof`; a client that tries to populate both has ambiguous/invalid intent.

## Compare the Issued Leaf with the Original Key

Extract the leaf from either v2 response variant:

```bash
jq -r '
  .signedCertificateEmbeddedSct.chain.certificates[0] //
  .signedCertificateDetachedSct.chain.certificates[0]
' response.json > issued-leaf.pem

openssl x509 -in issued-leaf.pem -pubkey -noout |
  openssl pkey -pubin -outform DER |
  openssl dgst -sha256
```

That digest must equal the original private-key SPKI digest. If it does, Fulcio issued the right key.

If Cosign later reports an artifact signature mismatch, compare the artifact signer's public key too. A common sequence is:

1. CSR for key A succeeds;
2. code discards key A;
3. artifact is signed with newly generated key B; and
4. verification correctly fails against the certificate's key A.

Fulcio cannot detect step 3 because artifact signing happens after issuance.

## Check the Server Algorithm Allowlist

Current Fulcio defaults permit:

- ECDSA P-256/SHA-256, P-384/SHA-384, and P-521/SHA-512;
- RSA PKCS#1 v1.5 with 2048, 3072, or 4096 bits and SHA-256; and
- Ed25519.

The server exposes `--client-signing-algorithms` to change that list. A CSR can be cryptographically valid with RSA/SHA-384, for example, yet fail policy if the deployed allowlist includes only the current RSA/SHA-256 defaults. Inspect the actual server arguments and do not weaken the list merely to accommodate an unexplained client.

Also distinguish a CA signing-key algorithm from the ephemeral client-key algorithm. This flag governs keys placed in issued leaves and their proof/CSR signature combination, not the KMS key used by Fulcio to sign certificates.

## Use a Controlled Negative-Test Matrix

Run these tests against staging:

| Mutation | Expected result |
| --- | --- |
| proof signs exact advertised claim with submitted key | issuance succeeds |
| append newline to challenge | invalid signature |
| sign `sub` for an email challenge | invalid signature |
| submit key A and proof from key B | invalid signature |
| corrupt one CSR signature byte | invalid signature |
| valid CSR, unsupported hash/algorithm | signing algorithm not permitted |
| weak RSA key | insecure public key |
| valid CSR with fake Subject/SAN | issuance uses token identity, not CSR names |
| valid proof with expired/wrong-audience token | identity-token error before proof checking |

These tests distinguish byte, key, policy, and token problems and protect custom client implementations from regressions.

## Official Documentation

- [Fulcio v2 API and proof/CSR definitions](https://github.com/sigstore/fulcio/blob/main/fulcio.proto)
- [Current Fulcio proof and CSR verification flow](https://github.com/sigstore/fulcio/blob/main/pkg/server/grpc_server.go)
- [Fulcio challenge verification implementation](https://github.com/sigstore/fulcio/blob/main/pkg/challenges/challenges.go)
- [Fulcio configuration API and challenge-claim mapping](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go)
- [Fulcio client signing-algorithm flag](https://github.com/sigstore/fulcio/blob/main/cmd/app/serve.go)
- [Fulcio architecture issuance requirements](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#3-issuance---life-of-a-request)
- [PKCS #10 certificate request syntax](https://www.rfc-editor.org/rfc/rfc2986)
- [ProtoJSON field encoding](https://protobuf.dev/programming-guides/json/)

## Conclusion

Proof-of-possession debugging is deterministic when one token, exact advertised claim value, keypair, signature/CSR, and request body stay together. Verify locally, compare SPKI digests before and after issuance, and inspect the server's algorithm policy; most “Fulcio key mismatch” reports are a changed byte, changed key, wrong claim, or wrong serialization at one of those boundaries.
