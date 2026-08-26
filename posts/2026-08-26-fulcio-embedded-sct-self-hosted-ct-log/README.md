# How to Configure Embedded SCTs for a Self-Hosted Fulcio Certificate Transparency Log

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, Certificate Transparency, SCT, Tesseract, Cosign, Private PKI

Description: Configure a self-hosted CT submission service and Fulcio's verified precertificate flow, identify which CA backends embed SCTs, test failure behavior, and distribute the log key safely.

---

Current Fulcio has no `--embedded-sct` flag. It chooses embedded SCTs automatically when two conditions are true:

1. a CT client is configured with a nonempty `--ct-log-url`; and
2. the selected CA backend implements Fulcio's `EmbeddedSCTCA` interface for precertificate creation and final-certificate issuance.

If either condition is false, Fulcio uses its ordinary certificate path and returns a detached SCT when a CT log is configured. This version-dependent interface check is why copying a nonexistent “enable embedded SCT” option does not work.

## Understand the Precertificate Transaction

For an embedded SCT, Fulcio:

1. builds the identity certificate template;
2. adds the critical CT poison extension `1.3.6.1.4.1.11129.2.4.3`;
3. signs that invalid precertificate with the Fulcio CA;
4. submits the precertificate and CA chain to the CT log's `add-pre-chain` API;
5. verifies and receives the log's SCT;
6. removes the poison, adds the SCT-list extension `1.3.6.1.4.1.11129.2.4.2`; and
7. signs and returns the final certificate.

The CA therefore performs two signatures per successful issuance. If CT submission fails, Fulcio returns an issuance error and never creates the valid final certificate. The already signed poison certificate is invalid to normal X.509 verifiers.

An SCT is a signed promise of inclusion, not itself a Merkle inclusion proof. Monitor the log and verify that promised entries are incorporated within its maximum merge delay.

## Pin a Backend That Implements the Flow

Current `main` embeds Fulcio's reusable `BaseCA` in `kmsca`, `fileca`, `tinkca`, `pkcs11ca`, and `ephemeralca`, so those types expose the embedded-SCT methods. The Google Cloud CA Service implementation has its own `CreateCertificate` path and does not expose those methods, so it takes the detached branch.

Older setup documentation says only KMS and file backends support embedded SCTs. Treat that statement and current source as evidence from different versions. Pin a Fulcio release, inspect its concrete CA type, and issue a canary certificate. The response's v2 oneof will be `signedCertificateEmbeddedSct` when the embedded flow was used.

Use `kmsca` with an online intermediate beneath an offline root for a typical production deployment. `fileca` and `ephemeralca` are testing-oriented; SoftHSM is not equivalent to a qualified hardware HSM.

## Configure the CT Log to Accept the Fulcio Hierarchy

Fulcio speaks the RFC 6962-style CT submission API through `certificate-transparency-go`. The current Fulcio Compose lab runs the official Tesseract static-CT implementation with arguments equivalent to:

```bash
tesseract \
  --http_endpoint=0.0.0.0:6962 \
  --storage_dir=/var/lib/tesseract \
  --origin=acme-fulcio-2026 \
  --private_key=/etc/tesseract/ct-private-key.pem \
  --roots_pem_file=/etc/tesseract/accepted-fulcio-roots.pem \
  --ext_key_usages=CodeSigning
```

Pin the Tesseract release and follow its deployment-specific storage documentation. The write API and static read surface are different operational concerns in Tesseract. Production also needs durable storage, backups, append-only monitoring, checkpoint distribution/witnessing, rate limits, high availability, and protected log signing keys.

`--roots_pem_file` controls which CA roots the log accepts. Put only the intended Fulcio roots there. During an intermediate rotation beneath the same root, valid chain submission can continue. During a root migration, update and validate the log's accepted roots before Fulcio starts using the new hierarchy.

The CT `--origin` is part of log identity/checkpoint operations. Give each environment and shard a stable, unique origin; do not reuse a production log key/origin in staging.

## Export and Pin the CT Public Key

The CT log public key is verification material. Derive it from the protected log signer through its supported interface and compare fingerprints with the deployment ceremony. For a file-key lab:

```bash
openssl pkey \
  -in ct-private-key.pem \
  -pubout \
  -out ct-public-key.pem

openssl pkey \
  -pubin \
  -in ct-public-key.pem \
  -outform DER |
  openssl dgst -sha256
```

The SHA-256 digest of the DER public key is the RFC 6962 Log ID shown in an SCT. Publish the public key through authenticated private trust distribution before the log issues production SCTs.

Do not give the CT private key to Fulcio. Fulcio needs only the CT public key so it can verify that the submission response came from the expected log.

## Configure Fulcio's CT Client

A KMS-backed example is:

```bash
fulcio-server serve \
  --ca=kmsca \
  --kms-resource='awskms:///arn:aws:kms:eu-west-1:123456789012:key/UUID' \
  --kms-cert-chain-path=/etc/fulcio/ca-chain.pem \
  --config-path=/etc/fulcio-config/config.yaml \
  --ct-log-url=https://ct-write.example.com/acme-fulcio-2026 \
  --ct-log-public-key-path=/etc/fulcio/ct-public-key.pem \
  --ct-log.tls-ca-cert=/etc/fulcio/ct-web-ca.pem
```

Use the exact submission base URL expected by the CT implementation. `--ct-log-public-key-path` makes the CT client verify SCT signatures. `--ct-log.tls-ca-cert` is only for an internal HTTPS CA; it does not replace the CT log signature key.

Current `--ct-log-origin` overrides the HTTP `Host` header when the routing origin differs from the URL host. It does not install a public key or rename the Log ID. Use it only for a reviewed reverse-proxy/routing requirement:

```text
--ct-log-origin=internal-ct-writer.example.net
```

Leaving `--ct-log-public-key-path` empty means Fulcio can accept the CT server response without locally pinning its signature key. Even if downstream clients later check the SCT, production Fulcio should pin and verify the expected log at issuance time.

## Verify the Returned Certificate

Issue with a synthetic identity and save the leaf plus chain. Inspect the extensions:

```bash
openssl x509 -in issued-leaf.pem -noout -text |
  grep -A 16 'CT Precertificate SCTs'

openssl x509 -in issued-leaf.pem -noout -text |
  grep -F '1.3.6.1.4.1.11129.2.4.3' &&
  echo 'ERROR: poison extension remained in final certificate'
```

The final leaf should display a CT Precertificate SCTs block, and it must not contain the poison extension. Compare the displayed Log ID and timestamp with the configured key and issuance time.

Do not use OpenSSL display output as the cryptographic SCT verifier. Verify a real bundle with Cosign and a private `TrustedRoot` containing the Fulcio chain and CT public key:

```bash
cosign verify \
  --bundle artifact.sigstore.json \
  --trusted-root trusted_root.json \
  --certificate-identity='EXPECTED_IDENTITY' \
  --certificate-oidc-issuer='EXPECTED_ISSUER' \
  IMAGE_AT_DIGEST
```

Also retrieve or scan the corresponding CT entry and verify log consistency/checkpoints. An embedded SCT proves the log promised inclusion; monitoring detects a log that breaks that promise or presents inconsistent views.

## Test Fail-Closed Behavior

In a nonproduction environment, test:

- wrong CT public key: Fulcio must reject the SCT/issuance;
- unreachable CT write endpoint: no valid final leaf is returned;
- CT log rejects the Fulcio root or Code Signing chain: issuance fails;
- an SCT signed by an old/untrusted CT key: verification fails unless the key and time interval are retained appropriately;
- TLS signed by an unknown internal web CA: connection fails until `--ct-log.tls-ca-cert` is correct;
- detached-only backend: v2 response selects the detached variant and the caller preserves its SCT; and
- CT storage/read publication outage after an SCT: alert because promised inclusion cannot be confirmed.

Check CA/HSM capacity too. The embedded flow doubles CA signature operations and turns CT write latency into Fulcio issuance latency.

## Publish CT Trust and Rotation Intervals

Create a Sigstore `TrustedRoot` entry with the CT URL, public key, origin, start time, and eventual end time. Publish it through private TUF before signers receive SCTs from that key.

For a new CT shard or key:

1. publish the new key and validity interval alongside historical keys;
2. let clients update;
3. point Fulcio at the new write URL/key;
4. verify canary Log ID and inclusion; and
5. freeze the old shard without deleting its public data or verification key.

Fulcio currently writes to one CT log even though the certificate extension can encode multiple SCTs. Do not document multi-log redundancy unless your reviewed implementation actually submits to and embeds every log.

## Official Documentation

- [Fulcio CT log and embedded SCT design](https://github.com/sigstore/fulcio/blob/main/docs/ctlog.md)
- [Fulcio certificate issuance overview](https://github.com/sigstore/fulcio/blob/main/docs/how-certificate-issuing-works.md)
- [Current embedded-SCT CA interface](https://github.com/sigstore/fulcio/blob/main/pkg/ca/embeddedca.go)
- [Current precertificate and final-certificate implementation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/baseca/baseca.go)
- [Fulcio server's embedded-versus-detached selection](https://github.com/sigstore/fulcio/blob/main/pkg/server/grpc_server.go)
- [Fulcio CT flags and client setup](https://github.com/sigstore/fulcio/blob/main/cmd/app/serve.go)
- [Current Fulcio/Tesseract Compose configuration](https://github.com/sigstore/fulcio/blob/main/docker-compose.yml)
- [Tesseract static CT implementation](https://github.com/transparency-dev/tesseract)
- [RFC 6962 certificate transparency](https://www.rfc-editor.org/rfc/rfc6962)
- [Cosign custom trusted roots](https://docs.sigstore.dev/cosign/system_config/custom_components/)

## Conclusion

Embedded SCTs are an automatic Fulcio backend capability, not a command-line toggle. Configure a compatible CA, a CT log that accepts the exact Fulcio hierarchy, and a pinned CT public key; then prove the final leaf has a valid SCT, no poison extension, and a monitored inclusion path before calling the deployment production-ready.
