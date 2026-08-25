# Validation Summary: How to Monitor Fulcio’s Certificate Transparency Log for Unauthorized Certificates for Your Identity

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Sigstore Fulcio and its RFC 6962 certificate-transparency log
- Sigstore `rekor-monitor`, `ct_monitor`, and `rekor_monitor`
- Fulcio certificate SANs and custom OID extensions
- Rekor v1, Rekor v2, and RFC 3161 timestamps
- GitHub Actions reusable workflows, OIDC identities, permissions, artifacts, and secrets
- Transparency-log checkpoints, Merkle consistency, inclusion verification, and incident response

## Sources Consulted

- [Pinned `rekor-monitor` repository](https://github.com/sigstore/rekor-monitor/tree/56b05695c67ddb0422a084ecd43c0ca537ddd1a9)
- [Pinned monitor configuration and error-handling loop](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/internal/cmd/common.go)
- [Pinned CT monitor command and RFC 6962 index calculations](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/cmd/ct_monitor/main.go)
- [Pinned CT v1 matching implementation](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/pkg/ct/v1/monitor.go)
- [Pinned JSON Lines output implementation](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/pkg/util/file/file.go)
- [Pinned CT reusable workflow](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/.github/workflows/ct_reusable_monitoring.yml)
- [Pinned base monitoring workflow](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/.github/workflows/base_monitoring.yml)
- [Pinned Rekor version selection](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/cmd/rekor_monitor/main.go)
- [Pinned Rekor v2 identity search](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/pkg/rekor/v2/identity.go)
- [RFC 6962 Section 4.6: Retrieve Entries from Log](https://www.rfc-editor.org/rfc/rfc6962#section-4.6)
- [Certificate Transparency Go v1.3.3 `GetEntries`](https://github.com/google/certificate-transparency-go/blob/v1.3.3/client/getentries.go)
- [Certificate Transparency Go v1.3.3 CTFE response limit](https://github.com/google/certificate-transparency-go/blob/v1.3.3/trillian/ctfe/handlers.go#L85-L88)
- [Current signed Sigstore trusted root](https://github.com/sigstore/root-signing/blob/main/targets/trusted_root.json)
- [Current default Sigstore signing configuration](https://github.com/sigstore/root-signing/blob/main/targets/signing_config.v0.2.json)
- [Opt-in Rekor v2 signing configuration](https://github.com/sigstore/root-signing/blob/main/targets/signing_config_rekor_v2.v0.2.json)
- [Fulcio certificate-issuing overview](https://docs.sigstore.dev/certificate_authority/certificate-issuing-overview/)
- [Fulcio CT log design and sharding](https://github.com/sigstore/fulcio/blob/main/docs/ctlog.md)
- [Fulcio OID field definitions](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Fulcio identity-provider configuration](https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml)
- [Sigstore threat model](https://docs.sigstore.dev/about/threat-model/)
- [Sigstore timestamp behavior for Rekor v1 and v2](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [Rekor v1 OpenAPI and index-search caveats](https://github.com/sigstore/rekor/blob/main/openapi.yaml)
- [Rekor v2 client, tile-monitoring, and search limitations](https://github.com/sigstore/rekor-tiles/blob/main/CLIENTS.md)
- [GitHub Actions OIDC reference](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub Actions reusable-workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations#supported-keywords-for-jobs-that-call-a-reusable-workflow)
- [GitHub Actions token-permission behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idpermissions)
- [GitHub Actions artifact API permissions](https://docs.github.com/en/rest/actions/artifacts#get-an-artifact)
- [GitHub Actions reusable-workflow secret handling](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows#passing-inputs-and-secrets-to-a-reusable-workflow)
- [`dawidd6/action-download-artifact` permission requirements at the pinned action commit](https://github.com/dawidd6/action-download-artifact/tree/57aa996fc1713cc1579039614f4645a7f4841fd4)

## Issues Found

- RFC 6962 `get-entries` responses do not contain indices and are not signed. The post previously advised verifying returned indices, while the client actually infers index `start + i`, and the pinned monitor does not bind downloaded leaves to its STH. Changed the historical-audit guidance to verify the signed snapshot STH, advance by actual response counts, track inferred contiguous indices, and reconstruct the Merkle root or verify inclusion proofs.
- The recurring RFC 6962 range has two boundary problems: it starts at `previous TreeSize - 1`, repeating the prior tip, and ends at `current TreeSize`, one past the snapshot. A checkpoint delta of exactly 1,000 therefore already requests 1,001 valid leaves and exceeds the public 1,000-entry cap. Corrected the threshold, required a fixed snapshot ending at `TreeSize - 1`, and added deduplication by CT log ID, index, and matcher.
- The trusted-root `validFor` interval applies to the CT log public key rather than promising service availability for a log shard. Reworded the `/2022`, `/test`, and historical-log statements as log-key trust intervals.
- The pinned reusable workflow can silently rebaseline in private repositories. The caller and both nested reusable workflows omit `actions: read`, and GitHub sets unspecified permissions to `none` when a permissions map is present. The cross-run downloader requires Actions read permission for private repositories, while its step is `continue-on-error`. Added the requirement to patch all workflow levels or use an external checkpoint store.
- The pinned monitor does not propagate many runtime failures to its process status. Consistency, identity-search, notification, and checkpoint-write errors can be printed before `ct_monitor` exits zero; with a restored checkpoint, the remaining workflow steps can succeed. Corrected the claim that a green workflow or `file_issue` reliably represents monitor health and required patched error propagation or independent liveness/log-error detection.
- The stock reusable workflow accepts only a plain configuration input and declares or forwards no secrets, so supported notification credentials cannot be supplied securely through it. Replaced the prior generic notification advice with a custom/forked workflow that explicitly forwards secrets, or separate notification based on retained JSON Lines output.
- At the pinned commit, `rekor_monitor` always reads `signing_config.v0.2.json`, whose public target currently lists only Rekor v1. It cannot select `signing_config_rekor_v2.v0.2.json` by passing the v2 URL, and its v2 identity code scans only the latest shard. Replaced the instruction to use the pinned binary for every v1/v2 log with version- and shard-aware guidance.
- Clarified two incident-response distinctions: Rekor v1 indexed search is deprecated, experimental, and best-effort, so complete coverage requires scanning; and refusing to serve a CT entry is availability misbehavior, while omitting or rewriting it in a later signed tree is an append-only consistency violation.

## Review Notes

- The pinned commit built successfully with `make build`, and its complete Go test suite passed.
- The documented `ct_monitor --url ... --config-file ...` flags and YAML fields are valid. A direct run against `https://ctfe.sigstore.dev/2022` successfully loaded the SAN/issuer and named OID matchers.
- Live checks on 2026-08-25 confirmed that the public `/2022` endpoint returns 1,000 entries for both `0..999` and the oversized `0..1999` request.
- The pinned reusable workflow's quoted `url` input defect is accurately documented: it passes the flag and value as one argument, which Go's flag parser rejects.
- On an RFC 6962 first run, the pinned monitor saves the current STH as a baseline without verifying its signature in that run; a later successful run verifies the stored and current STHs. The post now avoids treating that first baseline as a completed historical audit.
- Fulcio's embedded-SCT precertificate/final-certificate flow, current GitHub issuer, SAN/OID mappings, ten-minute certificate lifetime, Rekor timestamp distinctions, and Rekor v2 lack of online search are technically correct.
- `outputIdentitiesFormat: json` appends one JSON object per matched matcher. A single certificate matching several configured conditions can therefore produce several JSON Lines records, and resumed runs can duplicate the previous-tip match as noted above.
- The Fulcio README and CT design page still describe `/test` as current; the post correctly prioritizes the signed trusted-root metadata, which currently identifies `/2022` as the active trusted CT endpoint.
