# Validation Summary: How to Run Fulcio Locally with Docker Compose—and Why the Ephemeral CA Is Test-Only

## Status
validated

## Post Type
Technical guide and local-development tutorial

## Technologies Covered
- Fulcio
- Sigstore
- Docker Compose
- Dex and OpenID Connect (OIDC)
- Tesseract certificate transparency
- Fulcio `fileca` and `ephemeralca` backends
- Cosign v3 signing configuration and trusted-root material
- Rekor v1, Rekor v2, and RFC 3161 timestamp authorities
- The Update Framework (TUF)
- OpenSSL, curl, and jq

## Sources Consulted
- [Fulcio `main` Docker Compose stack at reviewed commit `2a7ebbb7`](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/docker-compose.yml)
- [Fulcio local setup and signing-backend guide](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/docs/setup.md)
- [Fulcio v2 API definition](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/fulcio.proto)
- [Fulcio deprecated v1 API definition](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/fulcio_legacy.proto)
- [Fulcio server flags and CA/CT initialization](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/cmd/app/serve.go)
- [Fulcio ephemeral CA implementation](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/pkg/ca/ephemeralca/ephemeral.go)
- [Fulcio certificate-transparency design](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/docs/ctlog.md)
- [Fulcio default identity configuration](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/config/identity/config.yaml)
- [Fulcio's bundled Dex configuration](https://github.com/sigstore/fulcio/blob/2a7ebbb7b5787335588a8f41c54a40ff4507f47c/config/dex/docker-compose-config.yaml)
- [Fulcio signing and CT architecture specification](https://github.com/sigstore/architecture-docs/blob/30974174a4aa05a2c73509a1d4391bd44c7eb764/fulcio-spec.md)
- [Tesseract POSIX deployment guide](https://github.com/transparency-dev/tesseract/blob/v0.1.1/cmd/tesseract/posix/README.md)
- [Cosign v3.1.3 Fulcio flag definition](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/options/fulcio.go)
- [Cosign v3.1.3 signing-configuration conflict handling](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/signcommon/common.go)
- [Sigstore custom-component configuration for Cosign](https://docs.sigstore.dev/cosign/system_config/custom_components/)
- [Sigstore timestamp behavior for Rekor v1, Rekor v2, and timestamp authorities](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [Docker Compose service port syntax](https://docs.docker.com/reference/compose-file/services/#ports)
- [Docker Compose `down` behavior](https://docs.docker.com/reference/cli/docker/compose/down/)

## Issues Found
- The root-certificate command used `/api/v1/rootCert`, which works but belongs to Fulcio's explicitly deprecated pre-GA v1 API. It was replaced with `/api/v2/trustBundle` plus `jq` extraction of the root certificate at the end of the first chain. The corrected command was tested and produced a PEM certificate accepted by OpenSSL.
- The port table could imply that the services are bound only to loopback. The Compose file omits host IP addresses, so Docker publishes the ports on all host interfaces by default. A warning and loopback/firewall guidance were added.
- The post described the bundled Dex service as ready for browser-based authentication. Current Compose starts Dex, but the default Fulcio identity file does not register Dex's `http://dex-idp:8888/auth` issuer, and the `dex-idp` hostname is not normally resolvable by a host browser. The text now requires a matching `FULCIO_CONFIG` and suitable issuer routing, and records Dex's actual `fulcio` client ID.
- The Cosign paragraph grouped `--fulcio-url` with environment variables as explicitly non-production. The official Fulcio guide applies that label to the environment-variable trust override; in Cosign v3.1.3, `--fulcio-url` is instead deprecated. Because Cosign v3 enables signing configuration by default and rejects simultaneous custom service URLs, the post now states that legacy direct-URL use also requires `--use-signing-config=false`.
- The Rekor explanation generalized signed integrated time across versions. It now states that Rekor v1's signed entry timestamp covers `integratedTime`, while Rekor v2 relies on a separate RFC 3161 timestamp authority.
- The production checklist implied that every suitable backend must support embedded SCTs. Fulcio supports detached SCTs for backends without embedded-SCT support, including its managed GCP CA backend. The checklist now recommends a CT-capable backend and monitored CT log, preferably with embedded SCTs.
- The official-documentation links were updated to include the current Fulcio v2 API, detailed Cosign custom-component guidance, version-specific timestamp behavior, and Docker's published-port semantics.

## Review Notes
- The version-sensitive claims were checked against Fulcio `main` commit `2a7ebbb7b5787335588a8f41c54a40ff4507f47c`, committed on 2026-08-24. The post correctly tells readers to pin and inspect a release or reviewed commit rather than treating `main` as a deployment contract.
- `docker compose config` and `docker compose build` succeeded for that commit. The documented standalone ephemeral command started successfully, and `/healthz`, `/api/v2/configuration`, `/api/v2/trustBundle`, and OpenSSL parsing were exercised locally.
- The current file-backed CA and CT keys are repository-tracked test material; the CA key decrypts with the Compose password. The test-only warnings for both `fileca` and `ephemeralca` agree with Fulcio's architecture specification.
- The upstream setup guide remains stale about the Compose topology: the repository changed from ephemeral CA/Trillian to file-backed CA/Tesseract, while the guide still describes the older stack. The post's warning about this mismatch is accurate.
- `docker compose down` retains the named CT volume by default, and `docker compose down --volumes` removes it, as described.
