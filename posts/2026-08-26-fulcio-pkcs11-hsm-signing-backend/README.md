# How to Use a PKCS#11 HSM as Fulcio’s Certificate-Signing Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, PKCS#11, HSM, SoftHSM, Private PKI, Certificate Authority

Description: Build Fulcio with PKCS#11 support, map its certificate ID and key label correctly, test issuance and embedded SCT behavior, and understand the backend's production limitations.

---

Fulcio includes a `pkcs11ca` backend that asks a PKCS#11 token to sign certificates without exporting the CA private key. The official documentation, however, says the implementation has only been validated with SoftHSM. Treat support for a specific hardware appliance, firmware, vendor module, high-availability topology, and session limit as something you must qualify against the exact Fulcio release you deploy.

There is another important current limitation: `pkcs11ca` loads one CA certificate, not an arbitrary signer-to-root chain. Its normal path finds that certificate in the token by ID; the AWS-HSM compatibility path loads one certificate from disk. This makes the backend effectively a direct-root signer as implemented. If your production policy requires the safer offline-root/online-intermediate design, use Fulcio's `kmsca` backend or extend and review the PKCS#11 implementation rather than pretending a missing chain flag exists.

## Pin a CGO-Enabled Build

PKCS#11 support is compiled only when CGO is enabled because Fulcio must load the vendor's C shared library. A binary built with `CGO_ENABLED=0` contains a stub that returns:

```text
binary has been built with no cgo support, PKCS11 not supported
```

Build from a reviewed release tag or commit on the same operating-system family used in production:

```bash
git clone https://github.com/sigstore/fulcio.git
cd fulcio
git checkout v1.8.8

CGO_ENABLED=1 go build -trimpath -o fulcio .
./fulcio serve --help | grep -E 'pkcs11|hsm'
```

Here, `v1.8.8` is the reviewed release used by this example; replace it only after reviewing and testing the newer release you intend to deploy. The runtime image also needs the dynamic loader and the exact PKCS#11 module library. Verify the binary's linked libraries and module architecture in CI. A build succeeding on a workstation does not prove the module can be loaded in the container.

## Qualify with SoftHSM First

SoftHSM is useful for checking object lookup and API behavior, but it is not a hardware security boundary. The official lab installs SoftHSM and OpenSC, then uses a `crypto11` JSON configuration:

```json
{
  "Path": "/usr/lib/softhsm/libsofthsm2.so",
  "TokenLabel": "fulcio",
  "Pin": "2324"
}
```

Initialize a disposable token and create an ECDSA P-384 key:

```bash
softhsm2-util \
  --init-token \
  --slot 0 \
  --label fulcio \
  --pin 2324 \
  --so-pin 2324

pkcs11-tool \
  --module /usr/lib/softhsm/libsofthsm2.so \
  --login \
  --login-type user \
  --keypairgen \
  --id 1 \
  --label PKCS11CA \
  --key-type EC:secp384r1
```

Set `SOFTHSM2_CONF` if the SoftHSM token directory is not using the system default. Never reuse these example PINs or token files. In production, mount the crypto11 configuration from a tightly permissioned secret and follow the vendor's PIN, partition, and client-certificate controls. Fulcio's documented JSON contains the user PIN in clear text; plan for secret delivery and process/filesystem access accordingly.

## Understand Fulcio's Two Object Selectors

Current Fulcio uses two independent selectors:

- `--hsm-key-label`, defaulting to `PKCS11CA`, finds the private/public key pair by label.
- `--hsm-caroot-id` finds the CA certificate by PKCS#11 certificate object ID.

The key ID used during `pkcs11-tool --keypairgen` is not what Fulcio uses to find the key; its label is. Conversely, the CA certificate lookup normally uses the certificate ID, not its label. Confirm the actual objects rather than assuming the same text selects both:

```bash
pkcs11-tool \
  --module /usr/lib/softhsm/libsofthsm2.so \
  --login \
  --list-objects
```

IDs are byte strings and command-line tools can display or parse them differently. Reproduce the official `createca`/serve pairing in the lab, then verify the exact ID representation against your vendor module.

## Create or Import the CA Certificate Carefully

The official lab flow uses the HSM key to create a self-signed certificate, imports it under a delegated certificate ID, and optionally writes a PEM copy:

```bash
./fulcio createca \
  --pkcs11-config-path=/etc/fulcio/crypto11.conf \
  --org='Example Fulcio Root CA' \
  --country=GB \
  --hsm-caroot-id=99 \
  --out=fulcio-root.pem
```

Do not promote that convenience command's output without profile validation. In current source it sets an organization but does not set a Subject common name explicitly. The normative Fulcio root profile requires both organization and common name, as well as exact critical usages, identifiers, and a positive random 160-bit serial. Use audited CA ceremony tooling with the HSM signer to produce a compliant root, then import the certificate object in the form expected by the backend.

If using the special `--aws-hsm-root-ca-path` option, Fulcio reads the single CA certificate from that PEM path instead of finding the certificate object in the token. Despite the flag name, the key is still found through the configured PKCS#11 module and key label. Protect the PEM's integrity and fingerprint; it is public but security-critical.

Before starting Fulcio, compare the certificate SPKI with the token's public key using vendor or OpenSC tooling. The current PKCS#11 backend does not call the same startup chain/key validation routine used by `kmsca` and `fileca`, so this preflight check is essential.

## Start the Backend

A current invocation is:

```bash
./fulcio serve \
  --ca=pkcs11ca \
  --pkcs11-config-path=/etc/fulcio/crypto11.conf \
  --hsm-key-label=PKCS11CA \
  --hsm-caroot-id=99 \
  --config-path=/etc/fulcio-config/config.yaml \
  --ct-log-url=https://ct.example.com/acme-2026 \
  --ct-log-public-key-path=/etc/fulcio/ct-public-key.pem
```

Pin the flags to the deployed release. Current `main` embeds Fulcio's reusable `BaseCA` in the PKCS#11 implementation, so it implements the precertificate/final-certificate methods used for embedded SCTs when a CT client is configured. Older setup prose says only KMS and file backends support embedded SCTs. Resolve this version difference with an issuance test; there is no separate `--embedded-sct` flag.

## Test the Complete Signing Path

Use a synthetic OIDC identity to issue one certificate, then verify:

```bash
openssl x509 -in issued.pem -noout \
  -subject -issuer -dates -text

openssl verify \
  -CAfile fulcio-root.pem \
  -purpose any \
  issued.pem
```

Confirm all of the following:

- the HSM audit trail records two CA signatures for the embedded-SCT flow: one precertificate and one final certificate;
- the final certificate has one critical identity SAN, critical Digital Signature usage, Code Signing EKU, and a ten-minute lifetime;
- the poison extension exists only on the logged precertificate, not the returned certificate;
- the returned certificate contains the SCT-list extension and Cosign verifies it with the private CT public key;
- the root presented by Fulcio is the reviewed root fingerprint; and
- an artifact signed by the issued leaf verifies with the complete private Sigstore trusted root.

Then test incorrect PIN, missing token, missing key label, wrong certificate ID, exhausted HSM sessions, network partition, device failover, CT outage, and process restart. Fulcio must fail issuance rather than sign with another object or silently fall back to an ephemeral/file key.

## Plan Capacity and Availability

An embedded SCT normally requires the CA signer twice per successful issuance. Size HSM operations-per-second, sessions, connection pools, and failover for that amplification plus retries. Measure latency under concurrency with the exact vendor library; SoftHSM performance says nothing useful about a network HSM.

The current backend creates a crypto11 context during startup and does not expose a certificate/key watcher. Routine key or certificate rotation therefore requires a controlled restart or rollout. A safe rotation creates a new object set, validates unique labels/IDs, distributes new trust material, and rolls replicas one group at a time. Never mutate a label so different replicas resolve different keys under the same configuration.

Monitor HSM authentication failures, object lookup failures, signature latency/errors, session exhaustion, administrative object changes, and certificate issuance counts. Reconcile HSM signature operations with Fulcio and CT records; remember that an embedded-SCT certificate consumes two CA signatures.

## Know When to Choose `kmsca` Instead

Use `kmsca` when you need:

- a supported signer-first chain with an online intermediate beneath an offline root;
- built-in startup verification that the chain matches the signer;
- cloud-managed workload identity without a vendor PKCS#11 client; or
- provider-qualified availability and audit integration.

Choose `pkcs11ca` only after the current root-only object model, CGO/vendor dependency, PIN delivery, certificate validation gap, and device qualification are explicitly accepted or fixed in a reviewed fork.

## Official Documentation

- [Fulcio HSM support guide](https://github.com/sigstore/fulcio/blob/main/docs/hsm-support.md)
- [Fulcio PKCS#11 setup flags](https://github.com/sigstore/fulcio/blob/main/docs/setup.md#pkcs11-hsm)
- [Current PKCS#11 backend implementation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/pkcs11ca/pkcs11ca.go)
- [No-CGO PKCS#11 behavior](https://github.com/sigstore/fulcio/blob/main/pkg/ca/pkcs11ca/pkcs11canocgo.go)
- [Fulcio PKCS#11 root creation command](https://github.com/sigstore/fulcio/blob/main/cmd/app/createca.go)
- [Current Fulcio server flags](https://github.com/sigstore/fulcio/blob/main/cmd/app/serve.go)
- [Normative Fulcio certificate profile](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#7-certificate-profile)
- [Thales crypto11 PKCS#11 library](https://github.com/ThalesGroup/crypto11)

## Conclusion

Fulcio can send CA signatures through PKCS#11, but production safety is not created by selecting `--ca=pkcs11ca`. Pin a CGO build, prove every object selector and profile field, qualify the real device under embedded-SCT load, and account for the current single-certificate/root-only and restart-based rotation model.
