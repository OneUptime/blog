# How to Rotate a File-Backed Fulcio Signing Key and Certificate Chain Without Restarting the Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, File CA, Key Rotation, X.509, fsnotify, Private PKI

Description: Rotate Fulcio's watched file-backed key and signer-first certificate chain in place, preserve the last valid pair during partial writes, verify the live trust bundle, and understand the feature's limits.

---

Fulcio's `fileca` backend can reload an encrypted signing key and certificate chain without restarting. The mechanism is deliberately small: it watches the two configured pathnames with `fsnotify`, reacts only to `Write` events, tries to load and validate the complete pair, and swaps the signer and chain together under a lock only when validation succeeds.

That design makes a two-file rotation possible, but it is not a general secret-volume reloader. It also does not make `fileca` suitable for production: Sigstore's architecture classifies the password-protected on-disk backend as testing-only. Use this procedure for labs, integration systems, or a deliberately accepted transitional deployment; use a protected KMS/HSM intermediate for a normal production CA.

## Confirm the Exact Runtime Behavior

Start with all current file flags explicit:

```bash
fulcio-server serve \
  --ca=fileca \
  --fileca-cert=/var/lib/fulcio/current/ca-chain.pem \
  --fileca-key=/var/lib/fulcio/current/ca-key.pem \
  --fileca-key-passwd="$FULCIO_FILECA_PASSWORD" \
  --fileca-watch=true \
  --config-path=/etc/fulcio-config/config.yaml \
  --ct-log-url=https://ct.example.com/acme-2026 \
  --ct-log-public-key-path=/etc/fulcio/ct-public-key.pem
```

Do not hard-code the password in a manifest. The current interface still passes the expanded flag value in the process arguments, where process inspection may expose it, and retains it for every reload. Fulcio does not watch a password file and cannot adopt a new key-encryption password without restart. This is another reason the project labels `fileca` as testing-only rather than a production secret-management design.

The certificate file must be PEM certificates ordered from the active signer to the root:

```text
active Fulcio intermediate
optional higher intermediates
root certificate
```

On every candidate reload, current Fulcio checks that the path verifies for Code Signing, the first certificate is a CA, an intermediate has the Code Signing EKU, the first certificate public key equals the private key, and the signer key passes Sigstore's key-strength validation.

## Know Which Filesystem Changes Are Supported

The watcher handles only events whose operation includes `fsnotify.Write`. It adds watches to the two files themselves, not to their parent directory.

This has practical consequences:

- truncating and rewriting the existing watched inode generates the event the code expects;
- an atomic rename or symlink swap can replace the pathname while the watch remains attached to the old inode;
- Kubernetes ConfigMap and Secret projected volumes normally rotate `..data` symlinks rather than writing the mounted file in place;
- `Create`, `Rename`, `Remove`, and `Chmod` alone are ignored; and
- watcher errors are not a success signal and there is no reload-status endpoint.

Do not use `mv new.pem ca-chain.pem`, `ln -sfn`, a projected Secret mount, or an editor that saves by rename unless a release-specific test proves it emits a usable write to the watched file and the watch remains live afterward.

## Stage a Complete Matching Pair

Create the new key and chain outside the watched directory. The first certificate must certify the new key and the new key must use the same encryption password already configured in the process.

Validate the private/public match without printing private material:

```bash
openssl pkey \
  -in staging/ca-key.pem \
  -passin env:FULCIO_FILECA_PASSWORD \
  -pubout \
  -outform DER |
  openssl dgst -sha256 > staging/key-spki.sha256

openssl x509 \
  -in staging/fulcio-intermediate.pem \
  -pubkey \
  -noout |
  openssl pkey -pubin -outform DER |
  openssl dgst -sha256 > staging/cert-spki.sha256

diff -u staging/key-spki.sha256 staging/cert-spki.sha256
```

Validate the path and inspect the signer certificate:

```bash
openssl verify \
  -CAfile staging/root.pem \
  -purpose any \
  staging/fulcio-intermediate.pem

openssl x509 -in staging/fulcio-intermediate.pem -noout \
  -subject -issuer -serial -dates -text

cat staging/fulcio-intermediate.pem staging/root.pem \
  > staging/ca-chain.pem
```

Check the complete root/intermediate certificate profile, not just the exit status. Record old and new certificate/SPKI fingerprints and validity intervals in the change request.

## Preserve and Test the Old Pair

Before touching watched files:

```bash
cp /var/lib/fulcio/current/ca-key.pem rollback-ca-key.pem
cp /var/lib/fulcio/current/ca-chain.pem rollback-ca-chain.pem

chmod 0600 rollback-ca-key.pem
chmod 0644 rollback-ca-chain.pem
```

Store the rollback copy in a protected, short-lived location and remove it through the approved secret-destruction process after the change window. Confirm that the live `/api/v2/trustBundle` still exposes the expected old fingerprint and that a canary issuance succeeds.

The live endpoint is an observation surface, not a source from which clients should bootstrap trust.

## Rewrite the Watched Inodes in Two Steps

Use an operation that opens the existing target for truncation and writes the new bytes. `tee` does that without replacing the pathname:

```bash
# Restrict access to the directory before the operation.
test -f /var/lib/fulcio/current/ca-key.pem
test -f /var/lib/fulcio/current/ca-chain.pem

tee /var/lib/fulcio/current/ca-key.pem \
  < staging/ca-key.pem \
  > /dev/null

tee /var/lib/fulcio/current/ca-chain.pem \
  < staging/ca-chain.pem \
  > /dev/null
```

Do not use this pattern through an untrusted shell or across an unreliable network filesystem. Preserve ownership and modes; truncating an existing inode normally preserves them, but verify:

```bash
stat /var/lib/fulcio/current/ca-key.pem
stat /var/lib/fulcio/current/ca-chain.pem
```

After the key write, the watcher will usually attempt a reload, see that the new key does not match the old chain, and retain the old in-memory pair. After the chain write, a later `Write` event sees the complete matching pair and installs both together. The mutex prevents an issuance goroutine from observing a new key with the old chain.

This is error tolerance, not a transaction or acknowledgment protocol. Multiple write events can occur during each command, and the watcher silently ignores a load error. Run the verification gate below before declaring success.

## Prove the Live Pair Changed

Poll the trust bundle until the first CA certificate has the expected new fingerprint. A safe inspection flow is:

```bash
curl --fail --silent --show-error \
  https://fulcio.example.com/api/v2/trustBundle |
  jq -r '.chains[0].certificates[0]' \
  > observed-signer.pem

openssl x509 -in observed-signer.pem -noout \
  -serial -dates -fingerprint -sha256
```

Then obtain a new leaf and verify:

- its Issuer is the new signer Subject;
- its AKI points to the new signer SKI;
- its signature verifies through the returned intermediate to the intended root;
- it contains a valid embedded SCT from the expected CT log; and
- a signed canary artifact verifies using the independently distributed private `TrustedRoot`.

Also verify a pre-rotation artifact. Rotation must not erase old public trust material needed to validate historical bundles.

## Roll Back with the Same In-Place Method

If the expected fingerprint never appears or canary issuance fails, rewrite the old key and old chain into the existing watched files. The order can again create a transient mismatch, which the watcher should ignore until both old files match.

If no write is observed, the watch was lost, or the encryption password changed, a controlled restart is required. Do not keep rewriting files blindly: repeated truncation increases the chance of leaving corrupt on-disk state even though the process still holds a valid old pair in memory.

## Coordinate Multi-Replica Rotation

Each Fulcio replica has its own in-memory signer and watcher. A shared filesystem write can update replicas at different times; per-pod volumes require a separate operation. During a rolling transition, the service can issue from both old and new intermediates.

Publish trust for both chains first, then rotate a canary replica, verify it, and proceed in bounded groups. Route or label canary traffic if you need deterministic observation. Keep both signer certificates accepted for the overlap and record which certificate serial/fingerprint each issuance used.

If the rotation changes the root, this is a trust-anchor migration, not merely a signer reload. Distribute the new root through TUF before issuance, retain the old root for historical verification, and apply explicit validity intervals and environment separation.

## Recognize Unsupported Cases

A restart is required when:

- the new private key uses a different encryption password;
- configured paths change;
- a symlink/projected-volume update loses the direct file watch;
- the watcher itself fails;
- you switch CA backend; or
- your release disables `--fileca-watch` or implements different behavior.

The backend also does not provide a reload counter, last-error metric, or transactional two-file format in current source. Add external fingerprint canaries and issuance tests rather than treating a successful file-copy command as proof.

## Official Documentation

- [Fulcio file-backed CA setup](https://github.com/sigstore/fulcio/blob/main/docs/setup.md#on-disk-file)
- [Current fileca watcher implementation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/fileca/watch.go)
- [Atomic in-memory signer/chain update](https://github.com/sigstore/fulcio/blob/main/pkg/ca/fileca/fileca.go)
- [File key, chain, and public-key validation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/fileca/load.go)
- [Shared Fulcio CA chain validation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/common.go)
- [Fulcio signing-backend architecture and fileca restriction](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#62-signing)
- [fsnotify project and platform notes](https://github.com/fsnotify/fsnotify)
- [Normative Fulcio certificate profile](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#7-certificate-profile)

## Conclusion

Hot rotation works only when Fulcio receives direct writes to both watched files and the new key decrypts with the already configured password. Stage and validate the pair, rewrite existing inodes, and prove the live signer fingerprint through a real issuance; for production, move the online intermediate key to a KMS or qualified HSM instead of relying on this testing-oriented backend.
