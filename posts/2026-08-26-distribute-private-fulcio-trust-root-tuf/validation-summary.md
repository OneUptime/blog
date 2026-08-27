# Validation Summary: How to Distribute a Private Fulcio Trust Root to Cosign Clients with TUF

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Cosign v3 and Sigstore bundles
- Fulcio and private PKI certificate chains
- Sigstore TrustedRoot and SigningConfig protobuf JSON
- Rekor v1, Rekor v2, certificate transparency logs, and RFC 3161 timestamp authorities
- The Update Framework (TUF), consistent snapshots, role keys, metadata expiry, rollback protection, and root rotation
- Sigstore root-signing, sigstore-go, go-tuf/v2, python-tuf, tuf-on-ci, and Sigstore scaffolding

## Sources Consulted

- [Cosign v3.1.2 release](https://github.com/sigstore/cosign/releases/tag/v3.1.2)
- [Cosign custom components and private trust](https://docs.sigstore.dev/cosign/system_config/custom_components/)
- [Cosign `initialize` command](https://github.com/sigstore/cosign/blob/v3.1.2/doc/cosign_initialize.md)
- [Cosign `trusted-root create` command](https://github.com/sigstore/cosign/blob/v3.1.2/doc/cosign_trusted-root_create.md)
- [Cosign `signing-config create` command](https://github.com/sigstore/cosign/blob/v3.1.2/doc/cosign_signing-config_create.md)
- [Cosign trusted-root implementation and log-origin handling](https://github.com/sigstore/cosign/blob/v3.1.2/cmd/cosign/cli/trustedroot/trustedroot.go)
- [Cosign initialization implementation](https://github.com/sigstore/cosign/blob/v3.1.2/cmd/cosign/cli/initialize/init.go)
- [sigstore-go SigningConfig TUF target lookup](https://github.com/sigstore/sigstore-go/blob/v1.2.1/pkg/root/signing_config.go)
- [sigstore-go TUF client](https://github.com/sigstore/sigstore-go/blob/v1.2.1/pkg/tuf/client.go)
- [Sigstore trusted-root and signing-config protobuf](https://github.com/sigstore/protobuf-specs/blob/v0.5.1/protos/sigstore_trustroot.proto)
- [Sigstore timestamp documentation](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [Sigstore CI quickstart and GitHub workflow identity format](https://github.com/sigstore/docs/blob/main/content/en/quickstart/quickstart-ci.md)
- [Fulcio HTTP API specification](https://github.com/sigstore/fulcio/blob/main/fulcio.swagger.json)
- [Sigstore root-signing repository and published trust targets](https://github.com/sigstore/root-signing)
- [The Update Framework specification 1.0.36](https://theupdateframework.github.io/specification/latest/)
- [go-tuf/v2](https://github.com/theupdateframework/go-tuf)
- [tuf-on-ci](https://github.com/theupdateframework/tuf-on-ci)
- [Sigstore scaffolding private TUF example](https://github.com/sigstore/scaffolding/blob/main/getting-started.md)

## Issues Found

- The post named the current SigningConfig TUF target `signing_config.json`. Cosign v3.1.2's sigstore-go dependency fetches `signing_config.v0.2.json`, so the output filename, repository target, initialization explanation, table, and conclusion were corrected to that required name.
- The TrustedRoot example supplied `origin` for an explicitly Rekor v1 deployment and a generic CT log. Cosign uses `origin` to derive checkpoint identifiers for Rekor v2 or static CT logs, so both values were removed from this v1/standard-CT example and the applicable checkpoint-origin rule was clarified.
- The TrustedRoot table described origins as serialized trust-root data. The CLI uses an origin only to derive a log identifier, so the table now says "log identifiers."
- Fulcio and TSA chain ordering was ambiguous. The inventory now specifies Fulcio intermediates before the offline root and an RFC 3161 TSA leaf-to-root chain, matching the Fulcio API and Cosign parsers.
- The published TUF layout incorrectly placed metadata below `metadata/` even though Cosign treats `--mirror` as the metadata base URL. The layout now shows metadata at that base, targets below `targets/`, version-prefixed metadata, hash-prefixed physical targets for consistent snapshots, and unprefixed logical target names.
- The tooling list used the ambiguous legacy name `go-tuf` and attributed `tuf-on-ci` to Sigstore. It now names `go-tuf/v2` and identifies `tuf-on-ci` as a TUF project used by Sigstore.
- The key-management guidance protected only the root role. Because the targets role authorizes the trust targets, it now calls for threshold/offline root and targets keys and separately describes snapshot and online timestamp-key protection.
- The freeze wording implied an availability guarantee. It now states that expiry makes stale metadata fail closed and exposes a potential freeze, while TUF cannot prevent denial of service.
- The initialization fallback was described as occurring only when `trusted_root.json` was missing. Cosign falls back on any load failure, so the condition was corrected.
- The rollback test was stated without client-state context even though rollback comparisons require retained trusted metadata. The test and cache warning now make that state dependency explicit.

## Review Notes

The command examples and flags were executed successfully with the official Cosign v3.1.2 Darwin ARM64 release using generated test certificates and keys. A live initialization against Sigstore's official TUF repository also confirmed that Cosign caches `signing_config.v0.2.json` and `trusted_root.json`. The TrustedRoot `jq` check is correct for Cosign v3.1.2, which still emits `application/vnd.dev.sigstore.trustedroot+json;version=0.1`; the current protobuf specification makes TrustedRoot v0.2 canonical, so this media-type assertion should be rechecked when upgrading to a later major Cosign release.
