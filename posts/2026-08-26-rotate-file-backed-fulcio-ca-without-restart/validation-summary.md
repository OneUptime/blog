# Validation Summary: How to Rotate a File-Backed Fulcio Signing Key and Certificate Chain Without Restarting the Server

## Status
validated

## Post Type
Operational guide / tutorial

## Technologies Covered
- Fulcio and its file-backed certificate-authority backend (`fileca`)
- Sigstore private trust roots and certificate-authority rotation
- X.509 certificate chains, EKU, SKI/AKI, and certificate transparency
- fsnotify file watching
- OpenSSL CLI certificate and public-key validation
- Bash pipeline failure handling
- Kubernetes ConfigMap, Secret, and projected-volume updates
- TUF-based trust distribution

## Sources Consulted
- Fulcio CLI flags and backend construction (current main commit `ae51cd5b978de4389588cbb20cb08845e4e8b98c`) — https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/cmd/app/serve.go
- Fulcio file watcher, direct file watches, locked update, and file loading — https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/fileca/watch.go, https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/fileca/fileca.go, and https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/fileca/load.go
- Fulcio certificate-chain validation and mutex-protected reader — https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/common.go and https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/signercerts.go
- Fulcio trust-bundle implementation and protobuf API — https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/baseca/baseca.go, https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/server/grpc_server.go, and https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/fulcio.proto
- Fulcio file-backed CA setup — https://github.com/sigstore/fulcio/blob/main/docs/setup.md#on-disk-file
- Sigstore Fulcio signing-backend and certificate-profile specification — https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#62-signing and https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#7-certificate-profile
- Sigstore client verification specification — https://github.com/sigstore/architecture-docs/blob/main/client-spec.md
- Sigstore `TrustedRoot` protobuf specification — https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_trustroot.proto
- Sigstore v1.10.8 PEM certificate parser — https://github.com/sigstore/sigstore/blob/v1.10.8/pkg/cryptoutils/certificate.go
- Go 1.26 X.509 path verification implementation — https://github.com/golang/go/blob/go1.26.0/src/crypto/x509/verify.go
- fsnotify v1.10.1 event, error-channel, file-watch, and filesystem semantics — https://github.com/fsnotify/fsnotify/blob/v1.10.1/fsnotify.go, https://github.com/fsnotify/fsnotify/blob/v1.10.1/shared.go, and https://github.com/fsnotify/fsnotify/blob/v1.10.1/README.md
- Kubernetes projected-volume and AtomicWriter symlink behavior — https://kubernetes.io/docs/concepts/storage/projected-volumes/ and https://github.com/kubernetes/kubernetes/blob/master/pkg/volume/util/atomic_writer.go
- OpenSSL 3.6 command and verification documentation — https://docs.openssl.org/3.6/man1/openssl-pkey/, https://docs.openssl.org/3.6/man1/openssl-x509/, https://docs.openssl.org/3.6/man1/openssl-dgst/, https://docs.openssl.org/3.6/man1/openssl-passphrase-options/, and https://docs.openssl.org/3.6/man1/openssl-verification-options/
- Bash pipeline and `pipefail` semantics — https://www.gnu.org/software/bash/manual/html_node/Pipelines.html
- curl command-line documentation and jq 1.8 manual — https://curl.se/docs/manpage.html and https://jqlang.org/manual/v1.8/
- GNU Coreutils `tee` documentation and POSIX `open()` semantics — https://www.gnu.org/software/coreutils/manual/html_node/tee-invocation.html and https://pubs.opengroup.org/onlinepubs/9799919799/functions/open.html
- Sigstore reference CT-log configuration and CT trusted-root validation — https://github.com/sigstore/scaffolding#ctlog and https://github.com/google/certificate-transparency-go/blob/master/trillian/ctfe/handlers.go
- RFC 5280, Internet X.509 PKI Certificate and CRL Profile — https://www.rfc-editor.org/rfc/rfc5280.html
- RFC 6962, Certificate Transparency — https://www.rfc-editor.org/rfc/rfc6962.html

## Issues Found
1. **Key-first writes could install an incomplete signer-only chain:** An fsnotify `Write` event does not indicate that a multi-write operation has finished. After the original procedure installed the new key, a chain-file prefix ending after the first complete signer certificate could parse successfully. Fulcio treats the last parsed certificate as the trust anchor, so that signer could validate as a one-certificate chain and be installed because it already matched the new key. Changed rotation and rollback to write the chain first and the key second. With genuinely different old and new signer keys, every partial new-chain candidate mismatches the old key, and the new pair is accepted only after the complete chain is present. Added the same-key certificate-only limitation.
2. **The SPKI comparison could fail open:** Without `pipefail`, Bash reports the status of the final `openssl dgst` command. If both upstream OpenSSL commands failed, both digest files contained the SHA-256 digest of empty input and `diff` succeeded. Added `set -o pipefail`, chained both pipelines and `diff` with `&&`, and clarified that the password variable must be exported for OpenSSL's `env:` password source.
3. **The staged-root check did not isolate the intended trust anchor:** `-CAfile` can coexist with default trust sources. Replaced it with `-trusted staging/root.pem`, which disables default CA sources, and added `-x509_strict` and `-show_chain`. Kept `-purpose any` because OpenSSL's Code Signing purpose is an end-entity target check and rejects a valid CA signer; the post now explicitly states that the CA certificate profile still requires separate inspection. Added the required `-untrusted` handling for hierarchies with higher intermediates.
4. **Watcher-error behavior was understated:** Fulcio's file watcher reads only `watcher.Events`; it does not consume or expose `watcher.Errors`. With the current unbuffered fsnotify error channel, an error can stall further delivery. Corrected the limitation and made the NFS, SMB, and FUSE notification warning explicit.
5. **Root migration omitted CT-log trust configuration:** A CT-enabled private Sigstore deployment whose log validates submissions against configured roots must make the new Fulcio chain/root acceptable before submitting new-root precertificates; Sigstore's reference deployment has this requirement. Added that check. Also generalized client distribution to an independently authenticated channel, using a private TUF repository as an example because the `TrustedRoot` specification does not mandate one population mechanism.
6. **Trust overlap and rollback scope needed precision:** Clarified that both old and new chains must first be published in the independently distributed `TrustedRoot`, and that an old signer must not be restored when it is known or suspected to be compromised.

## Review Notes
- Review was performed against Fulcio main commit `ae51cd5b978de4389588cbb20cb08845e4e8b98c` from 2026-08-26, which pins fsnotify v1.10.1 and sigstore v1.10.8. The watcher behavior is implementation-specific and should be revalidated for the deployed Fulcio release and filesystem.
- Fulcio's `/api/v2/trustBundle` exposes only the currently loaded file-CA chain; it does not retain the old chain. Historical and overlap trust must therefore live in the independently distributed `TrustedRoot`.
- The current Sigstore architecture marks `fileca` as testing-only and says it must not be used for production. The post correctly preserves that restriction.
- Fulcio file-CA, base-CA, and server package tests passed against the reviewed source. The signer-only prefix acceptance and the empty-input SPKI digest failure were also reproduced during review.
