# Fix Fulcio `x509: Certificate Signed by Unknown Authority`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Cosign, Sigstore, X.509, TUF, Certificate Troubleshooting, Private PKI

Description: Identify whether an unknown-authority error comes from TLS or Fulcio leaf verification, isolate public, staging, and private trust caches, repair incomplete chains, and verify the intended identity.

---

`x509: certificate signed by unknown authority` means that one certificate path could not reach a trusted anchor. In a Sigstore workflow, there are several different certificate paths, so installing another CA at random often fixes the wrong one-or dangerously combines trust domains that should remain separate.

First locate the failing path: HTTPS to Fulcio, Rekor, the CT log, OIDC provider, registry, or TUF mirror uses ordinary TLS trust. Verification of the short-lived signing certificate uses Sigstore's Fulcio trust from TUF or a supplied `TrustedRoot`. These are separate trust stores and require different fixes.

## Classify the Error Before Changing Trust

Run the failing command with `--verbose` and note its phase. Then probe the relevant HTTPS endpoint independently:

```bash
curl --verbose https://fulcio.example.com/healthz

openssl s_client \
  -connect fulcio.example.com:443 \
  -servername fulcio.example.com \
  -verify_hostname fulcio.example.com \
  -showcerts \
  -verify_return_error \
  < /dev/null
```

Use this map:

| Failure point | Trust it needs | Typical fix |
| --- | --- | --- |
| HTTPS before any Fulcio API response | OS/container TLS roots and the server leaf plus required intermediates | repair the ingress's intermediate chain or install the corporate TLS root in the workload image |
| OIDC discovery/JWKS from the Fulcio server | Fulcio container's TLS roots, or issuer `ca-cert` | serve the IdP leaf plus required intermediates or configure the internal issuer CA |
| `cert verification failed: x509...` during Cosign verification | intended Fulcio CA in Sigstore trust material | initialize the correct TUF domain or pass the correct `--trusted-root` |
| `openssl verify` of a leaf | root plus all required intermediates | supply signer-to-root chain in the right roles/order |

Do not use `curl -k`, Cosign's `--allow-insecure-registry`, `--insecure-ignore-sct`, or `--insecure-ignore-tlog`, or a catch-all corporate root bundle as a permanent fix. Those workarounds bypass verification or blur trust domains, removing the evidence needed to distinguish an attacker from a misconfiguration.

## Identify the Certificate You Actually Have

Extract the leaf from the Sigstore bundle or signing response. Obtain the CA chain from the signing response or authenticated `TrustedRoot`/TUF material, then record:

```bash
openssl x509 -in leaf.pem -noout \
  -subject -issuer -serial -dates -fingerprint -sha256 -text

openssl x509 -in intermediate.pem -noout \
  -subject -issuer -fingerprint -sha256

openssl x509 -in root.pem -noout \
  -subject -issuer -fingerprint -sha256
```

The leaf's Issuer DN must match the first CA certificate's Subject DN under X.509 name-comparison rules, and every subsequent Issuer/Subject pair must match toward the intended root. Those name matches are necessary but not sufficient: use path validation to verify signatures and constraints. Compare fingerprints, not just friendly common names.

Check the leaf's OIDC issuer extension and SAN too. A certificate chaining successfully to the wrong environment is not a valid release identity.

## Keep Public, Staging, and Private TUF Caches Separate

The public-good instance, Sigstore staging, and a private Fulcio deployment have different trust roots.

Public production uses the root embedded in Cosign plus the official production TUF mirror:

```bash
export TUF_ROOT=/var/lib/sigstore/tuf/public-production
cosign initialize
```

Sigstore staging has its own root and endpoints:

```bash
export TUF_ROOT=/var/lib/sigstore/tuf/public-staging
cosign initialize --staging
```

Staging is for development and has neither the production SLO nor the same root-key protections. A staging certificate should not verify as public production.

A private deployment needs an out-of-band private TUF root:

```bash
export TUF_ROOT=/var/lib/sigstore/tuf/example-private

cosign initialize \
  --root /etc/sigstore/example-private/1.root.json \
  --mirror https://tuf.example.com
```

Current `cosign initialize` clears the selected TUF cache before rebuilding it. Reusing the default cache for all three environments means the last initialization wins. Dedicated per-environment `TUF_ROOT` directories eliminate cross-domain ambiguity; use per-job caches or serialize initialization to prevent concurrent jobs from rewriting the same environment's trust state.

To return a dedicated public cache to production, run `cosign initialize` in that cache; do not merely stop passing `--staging` while continuing to use a cache populated from another mirror.

## Repair Public-Instance Trust

For a genuine public Fulcio certificate:

1. verify the configured URL is `https://fulcio.sigstore.dev`, not staging or an unintended proxy, and compare the signing CA fingerprints with TUF-authenticated production material;
2. use a current, verified Cosign release;
3. initialize/refresh the production TUF cache with `cosign initialize`;
4. ensure the system clock is correct so live TLS connections and TUF metadata are evaluated at the right time; and
5. remove test overrides such as `SIGSTORE_ROOT_FILE`, `SIGSTORE_CT_LOG_PUBLIC_KEY_FILE`, `SIGSTORE_REKOR_PUBLIC_KEY`, `TUF_MIRROR`, and `TUF_ROOT_JSON` unless deliberately required.

Fulcio's public `/api/v2/trustBundle` can be inspected, but the Fulcio README explicitly says to verify that chain using Sigstore's TUF root. Do not overwrite trusted production roots with an unauthenticated download from the service being checked.

If HTTPS to the public service fails only behind an enterprise proxy, fix the proxy's TLS trust in the container or exempt the endpoint according to policy. That corporate TLS root authorizes the proxy connection; it is not a Fulcio code-signing root and must not be inserted into `trusted_root.json` as one.

## Repair Staging Trust

Use `cosign initialize --staging` in a staging-only cache and verify that every configured service is a staging service. The documented endpoints include `fulcio.sigstage.dev`, `rekor.sigstage.dev`, and the staging OIDC issuer.

A production certificate failing under staging trust, or a staging certificate failing under production trust, is the expected security boundary. Fix the selected environment rather than merging both roots into a global file.

Do not ship staging roots or private test roots in a production verifier image. If one tool must verify several domains, select an explicit trusted-root file and identity policy per verification operation.

## Repair Private Fulcio Trust

For private keyless verification, create a Sigstore `TrustedRoot` that contains the private Fulcio CA chain and the matching CT/Rekor/TSA material, publish it through private TUF, and initialize with the private initial root and mirror. Current Cosign emits the `TrustedRoot` v0.1 media type; treat that media type as a versioned interface and check it again when upgrading Cosign.

For an explicit Cosign v3 verification:

```bash
cosign verify \
  --trusted-root /etc/sigstore/example-private/trusted_root.json \
  --certificate-identity='https://ci.example.com/workflows/release' \
  --certificate-oidc-issuer='https://id.example.com' \
  registry.example.com/widget@sha256:DIGEST
```

`cosign verify` reads the image's OCI-attached verification material from the registry. For a detached blob bundle, use `cosign verify-blob --bundle artifact.sigstore.json` instead.

`--trusted-root` is a Sigstore JSON document, not a PEM path. Legacy `SIGSTORE_ROOT_FILE` accepts Fulcio PEM roots for older flows, but current Cosign deprecates separate CA-root/intermediate flags in favor of the complete trusted-root document. Do not mix the interfaces accidentally.

If your private TUF mirror is signed by a private root, `--mirror` alone cannot work: Cosign's embedded public TUF root does not authorize it. Supply the private `--root` during bootstrap.

## Fix an Incomplete or Reversed Fulcio Chain

For `kmsca` and `fileca`, provide the CA chain signer-first and, when the signer chains to a root, root-last. A root-first file is invalid. Current Fulcio can accept an intermediate-only file by treating its last-and only-certificate as the trust anchor, but that truncates the published chain and changes the intended anchor; include the root when it is the intended trust anchor.

Build and test explicitly:

```bash
cat fulcio-intermediate.pem fulcio-root.pem > fulcio-ca-chain.pem

openssl verify \
  -trusted fulcio-root.pem \
  -untrusted fulcio-intermediate.pem \
  -purpose any \
  leaf.pem
```

`openssl verify` uses the current system time by default. For an archived leaf, add `-attime "$VERIFIED_UNIX_SECONDS"`, using only a cryptographically authenticated Rekor integrated time or RFC 3161 timestamp; otherwise a valid short-lived Fulcio certificate will appear expired.

Do not place the intermediate in the trusted pool just to make the command green. In this hierarchy, the root is the intended trust anchor and the intermediate is untrusted path-building material. With a complete configuration, current Fulcio returns chains leaf-first and its trust-bundle API returns each CA chain intermediate-first/root-last.

If OpenSSL verifies but Fulcio refuses startup, inspect the active CA certificate: when it is an intermediate it must have the Code Signing EKU; it must be `CA:TRUE` and match the signing key. Also check the signing key's strength and the chain's validity. Fulcio performs checks beyond basic file parsing.

## Distinguish TLS Roots from Sigstore Roots

An internal Fulcio deployment often has two unrelated CAs:

- a web PKI CA for `https://fulcio.example.com`; and
- the Fulcio code-signing CA that issues identity certificates.

Install the web CA in the operating system/container trust used by HTTP clients. Put the code-signing CA in the Sigstore `TrustedRoot`. Reusing one CA for both purposes broadens compromise impact and makes diagnosis harder.

The same distinction applies when Fulcio contacts a private OIDC issuer. Current Fulcio supports a PEM `ca-cert` in that issuer's YAML configuration so discovery and JWKS TLS can trust an internal web CA. That CA does not become a Fulcio signing root.

## Use the Error That Comes Next

Once the chain reaches the intended root, verification may correctly fail later:

- missing CT key or invalid SCT;
- missing Rekor key, SET, or inclusion proof;
- missing trusted timestamp;
- expired service trust interval;
- certificate identity or issuer mismatch; or
- artifact signature mismatch.

Do not respond by disabling the next check. Each failure identifies another required part of the private Sigstore trust domain. Provide the matching authenticated material and keep an exact SAN/issuer policy.

## Official Documentation

- [Sigstore public and staging deployments](https://docs.sigstore.dev/cosign/system_config/public_deployment/)
- [Cosign initialization and TUF cache behavior](https://github.com/sigstore/cosign/blob/main/doc/cosign_initialize.md)
- [Cosign custom components and trusted roots](https://docs.sigstore.dev/cosign/system_config/custom_components/)
- [Cosign verification command](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)
- [Fulcio public trust-bundle guidance](https://github.com/sigstore/fulcio#public-instance)
- [Fulcio v2 trust-bundle API](https://github.com/sigstore/fulcio/blob/main/fulcio.proto)
- [Fulcio CA chain validation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/common.go)
- [Fulcio private OIDC CA configuration source](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go)

## Conclusion

Fix unknown-authority errors by identifying the exact certificate path, selecting one intended trust domain, and supplying the missing root or intermediate in the correct trust store. Public, staging, private Sigstore, and ordinary TLS roots should remain visibly separate; a failure across those boundaries is usually protection working as designed.
