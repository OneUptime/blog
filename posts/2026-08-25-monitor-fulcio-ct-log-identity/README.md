# How to Monitor Fulcio’s Certificate Transparency Log for Unauthorized Certificates for Your Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, Certificate Transparency, Rekor Monitor, GitHub Actions, Incident Detection, Supply Chain Security

Description: Continuously scan Fulcio CT shards for email, workflow, issuer, and OID matches, preserve checkpoints, reconcile every issuance with an authorized release, and respond to unexpected certificates.

---

Fulcio's certificate-transparency (CT) log makes issuance auditable, typically by logging a precertificate before Fulcio returns the final certificate; it does not decide whether an issuance was authorized. Identity owners must monitor for their SANs and CI metadata, then reconcile every match with an expected signing event.

Sigstore's `rekor-monitor` repository now builds two binaries: `rekor_monitor` for the Rekor signature log and `ct_monitor` for Fulcio certificate logs. The current CT matching path handles certificate SAN/issuer pairs and Fulcio OID extension values while also checking log consistency. Although the shared configuration format also defines generic subjects and fingerprints for Rekor monitoring, current CT v1 and v2 matching code does not process those matcher types.

## Monitor Both Identity and Log Integrity

There are two distinct detection goals:

- **Identity monitoring:** find every logged certificate or precertificate containing your email, workflow URI, repository URI, or other governed identity and classify it as expected or unexpected.
- **Consistency monitoring:** verify append-only evolution and compare checkpoints with independent monitors or witnesses so removal, rewriting, and split views create detectable inconsistencies.

A matching certificate is not automatically malicious. A normal release should produce one. Conversely, a successful consistency check does not mean every certificate was authorized. Run both checks and retain their state.

## Define Exact Monitored Values

Create a configuration that covers the entire identity namespace you own:

```yaml
# One bounded RFC 6962 backfill window; advance both bounds contiguously.
startIndex: 0
endIndex: 999

monitoredValues:
  certIdentities:
    - certSubject: '^release-bot@example\.com$'
      issuers:
        - '^https://accounts\.google\.com$'

    - certSubject: '^https://github\.com/acme/widget/\.github/workflows/release\.yml@refs/tags/v[0-9]+\.[0-9]+\.[0-9]+$'
      issuers:
        - '^https://token\.actions\.githubusercontent\.com$'

  oidMatchers:
    fulcioExtensions:
      source-repository-uri:
        - https://github.com/acme/widget
      build-config-uri:
        - https://github.com/acme/widget/.github/workflows/release.yml@refs/heads/main

outputIdentities: identities.jsonl
outputIdentitiesFormat: json
```

`certSubject` and `issuers` are regular expressions, so anchor them with `^` and `$` and escape literal dots. Named Fulcio extension values are exact string matches, not regexes. Use an OID matcher when a reusable workflow makes the SAN point to a central signer but the Source Repository or Build Config URI identifies your repository. Each certificate-identity or OID matcher is an independent OR condition; only the issuer list is combined with its `certSubject`, so enforce the complete expected tuple during reconciliation.

The explicit indices above scan one inclusive 1,000-entry window on the current RFC 6962 log, and `outputIdentitiesFormat: json` appends each match as one JSON object per line. At the pinned commit, `ct_monitor` makes one `get-entries` request and does not paginate. RFC 6962 permits a log to return fewer entries than requested, and the public log currently caps a response at 1,000, so `startIndex: 0` without a bounded `endIndex` is not a complete historical backfill.

For a historical audit, obtain and verify a signed snapshot tree head (STH), then use a pagination-capable wrapper or scanner to walk every contiguous range through `TreeSize - 1`. RFC 6962 `get-entries` responses are unsigned and contain no explicit indices, so track each inferred index as `start + i`, advance by the actual returned count, and cryptographically bind the downloaded leaves to the snapshot by reconstructing its Merkle root or verifying inclusion proofs. Record progress separately. Do not treat `ct_monitor`'s latest saved checkpoint as proof that an oversized requested range was fully returned or that the returned leaves were bound to that checkpoint.

If neither an explicit start index nor a prior checkpoint exists, current monitor code only saves the current checkpoint on its first run; it does not search historical entries. On a resumed RFC 6962 run, it starts at `previous TreeSize - 1` and requests through `current TreeSize`, so it re-requests the prior tip and asks one index beyond the snapshot. A 1,000-entry checkpoint delta therefore already exceeds the public log's 1,000-entry response cap and can omit a new identity before the monitor saves the newer checkpoint. The repeated tip can also re-emit an earlier match. A complete production identity monitor must scan a fixed snapshot in verified bounded requests before committing its new checkpoint and deduplicate findings by CT log ID, index, and matcher.

GitHub Actions' correct OIDC issuer is `https://token.actions.githubusercontent.com`. Do not substitute GitHub's interactive-login issuer or shorten this to a look-alike `token.actions.github.com` hostname.

For a reusable workflow, monitor at least:

- the Build Signer URI of the central reusable workflow;
- your Source Repository URI;
- your Build Config URI; and
- the GitHub issuer.

Monitoring those fields independently catches certificates for your source repository even when the certificate SAN is shared across many callers of a centralized signer; the authorization ledger then verifies that they occur together as expected.

## Run `ct_monitor` Directly

Build the official project at a reviewed commit or use a verified release artifact:

```bash
git clone https://github.com/sigstore/rekor-monitor.git
cd rekor-monitor
git checkout 56b05695c67ddb0422a084ecd43c0ca537ddd1a9
make build

./ct_monitor \
  --url https://ctfe.sigstore.dev/2022 \
  --config-file ../ct-config.yaml
```

The public log URL is versioned deployment data. Current signed Sigstore trust material identifies `https://ctfe.sigstore.dev/2022` as the production log, with the log public key's trust interval beginning on October 20, 2022 and no end date; it is also the pinned monitor's compiled default. The `/test` log key's trust interval ended on October 31, 2022, despite stale Fulcio README and design text still describing that URL as current. For direct runs, pass an explicit URL from current signed trusted configuration rather than relying on prose or a compiled default.

Fulcio's architecture permits periodic sharding. Monitor the current production shard continuously and backfill each historical log whose log-key trust interval is relevant to artifacts you still accept, using separate checkpoints and complete range coverage. A monitor attached only to the newest shard cannot discover an older unauthorized issuance that predates its start.

## Schedule the Official Reusable Workflow

The official repository provides a CT-specific reusable workflow. Pin it to a reviewed commit rather than `@main`:

```yaml
name: Fulcio CT consistency monitor

on:
  schedule:
    - cron: '17 * * * *'
  workflow_dispatch:

permissions: read-all

jobs:
  monitor-public-fulcio:
    permissions:
      contents: read
      issues: write
    uses: sigstore/rekor-monitor/.github/workflows/ct_reusable_monitoring.yml@56b05695c67ddb0422a084ecd43c0ca537ddd1a9
    with:
      file_issue: true
      artifact_retention_days: 14
```

The official project recommends hourly monitoring, but at this pinned commit treat the reusable workflow as a best-effort runner rather than a reliable consistency-health signal. Set artifact retention longer than the schedule interval because the workflow uses retained state to continue those checks. Its first run has no retained checkpoint and establishes a new baseline. Artifact restoration is configured with `continue-on-error`, so a restore failure can also rebaseline silently; inspect restore logs and keep an external copy of each checkpoint for high-assurance monitoring.

When a workflow or job specifies a `permissions` map, GitHub sets every unspecified job-token permission to `none`. The caller job above and both pinned reusable-workflow levels omit `actions: read`, which the cross-run artifact downloader requires in a private repository. A caller cannot re-elevate a permission removed by a nested reusable workflow, so a private repository needs a reviewed fork that grants `actions: read` at the caller and both reusable-workflow levels, or an external checkpoint store.

At this pinned commit, do not set the reusable workflow's `url` input: its base workflow combines `--url` and the value into one quoted argument, which Go's flag parser rejects. Omitting the input here uses the reviewed commit's `/2022` default. Recheck that implementation before enabling the input at a later revision.

Do not use the stock hourly reusable workflow as the sole identity detector. Its RFC 6962 identity scan is not paginated and can advance the checkpoint after a capped response, omitting the rest of a large delta. Use a custom pagination-capable wrapper that verifies the snapshot and complete contiguous coverage before persisting the checkpoint.

The pinned `MonitorLoop` also prints many consistency, identity-search, notification, and checkpoint-write errors and then returns without making `ct_monitor` exit nonzero. With an old checkpoint already restored, the upload and final `cat` can still succeed, leaving the GitHub job green. The reusable workflow's `file_issue` option reacts to GitHub job failure, not every monitor-detected failure, and can therefore miss an error or close a prior issue on this false success; patch error propagation in a reviewed fork or add an independent liveness and log-error check before relying on it.

`file_issue` does not report identity matches. Matches are printed in job logs, but the base workflow uploads only the checkpoint, not an `outputIdentities` file. The stock workflow also declares and forwards no secrets, so its plain `config` input cannot securely carry credentials for the supported notification integrations. Use a custom or forked workflow that declares secrets and materializes the configuration at runtime, or explicitly retain the JSON Lines output and notify separately. Do not embed a personal access token in inline workflow configuration. “Unauthorized” remains an organizational judgment, so treat every distinct match as pending until it corresponds to an approved release record.

## Reconcile Matches with an Authorization Ledger

For each expected signing event, record before or during release:

- artifact digest;
- exact SAN and issuer;
- expected Build Signer and Build Config URI/digest;
- source repository digest and ref;
- GitHub run ID and attempt;
- release approval or protected environment; and
- expected time window.

When the monitor reports a match, retrieve the CT entry by index and compare its serial number, SPKI/public-key fingerprint, SAN, issuer, and extension tuple with this ledger. An embedded-SCT flow logs a poison-extension precertificate and returns a separately signed final certificate, so their DER certificate fingerprints differ; preserve and compare the final certificate separately when it is available. Alert when:

- no approved release exists;
- the signer or build-config digest is not reviewed;
- the source commit differs from the built artifact record;
- the runner environment is forbidden;
- the trigger or ref is unexpected;
- a run attempt occurs after the release was closed; or
- the same identity appears at an unusual rate.

Do not suppress all certificates from an approved SAN. An attacker with the same compromised workflow identity would deliberately use the expected SAN; immutable digests, run invocation, timing, and artifact records provide the discrimination.

## Monitor Rekor Too

Fulcio CT tells you that a certificate or, normally, a precertificate was logged as part of issuance. Rekor tells you which artifact digest and signature were logged and can carry the final certificate used to verify the signature. Monitor every relevant Rekor v1 and v2 log alongside Fulcio CT so an incident responder can link unexpected issuance to possible signed artifacts.

With the default public TUF repository at this pinned commit, `rekor_monitor` always loads `signing_config.v0.2.json`, which currently lists only Rekor v1. It cannot select the opt-in `signing_config_rekor_v2.v0.2.json`; passing the public v2 URL alone takes the v1 path. Even with a custom TUF repository that exposes v2 through the expected target name, the pinned v2 identity search scans only the latest shard. Use `rekor_monitor` for the public v1 log and a reviewed v2-capable scanner or configuration that loads the opt-in v2 target and covers every relevant v2 shard, with separate checkpoints.

The logs are complementary:

| Signal | Fulcio CT | Rekor |
| --- | --- | --- |
| certificate/precertificate logged | yes, normally a precertificate | final certificate can be present with a signing entry |
| artifact digest and signature | no | yes |
| certificate-issuance auditability | yes | not its primary role |
| time evidence for the artifact signature | no | v1 signs log integration time; v2 uses a separate RFC 3161 timestamp authority |

An unauthorized Fulcio certificate with no observed Rekor artifact is still an incident: it may have been used offline, logged later, or issued as a probe.

## Respond to an Unexpected Certificate

1. Preserve the CT entry, logged certificate or precertificate bytes, serial number, SPKI fingerprint, log checkpoint, and monitor output; preserve the final certificate separately if recovered.
2. Use Rekor v1's deprecated, experimental, best-effort index search only for leads, then scan every relevant v1 range for the final certificate, public-key fingerprint, identity, and related artifact entries. Rekor v2 has no online search API, so use complete retained monitor results or scan its tiles.
3. Disable the affected OIDC principal or workflow and revoke its ability to request new tokens.
4. Inspect the GitHub or CI run URI, commit, workflow digests, runner type, and audit log.
5. Block or retract affected artifact digests through consumer policy and release channels.
6. Rotate compromised non-ephemeral credentials and repair branch, environment, or runner controls.
7. Continue monitoring; omitting or rewriting the entry in a later signed tree would violate append-only consistency, while refusing to serve it would be availability misbehavior. Recurrence provides useful evidence. Compare checkpoints with independent monitors to detect forks.

Fulcio certificates are short-lived and normally avoid certificate revocation. Incident containment therefore depends on stopping new identity tokens and making verifiers reject unauthorized artifacts or signer revisions, not relying on a ten-minute certificate to expire; a signature with valid time evidence can remain verifiable afterward, and its CT entry remains.

## Official Documentation

- [Sigstore Rekor and CT monitor repository](https://github.com/sigstore/rekor-monitor)
- [Pinned CT reusable monitoring workflow](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/.github/workflows/ct_reusable_monitoring.yml)
- [Pinned monitor loop, first-run checkpoint, and identity notification behavior](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/internal/cmd/common.go)
- [Pinned CT v1 identity matcher implementation](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/pkg/ct/v1/monitor.go)
- [Pinned Rekor v1/v2 selection](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/cmd/rekor_monitor/main.go)
- [Pinned Rekor v2 latest-shard identity implementation](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/pkg/rekor/v2/identity.go)
- [Pinned reusable workflow checkpoint and `file_issue` implementation](https://github.com/sigstore/rekor-monitor/blob/56b05695c67ddb0422a084ecd43c0ca537ddd1a9/.github/workflows/base_monitoring.yml)
- [GitHub Actions token-permission behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idpermissions)
- [GitHub Actions artifact API permissions](https://docs.github.com/en/rest/actions/artifacts#get-an-artifact)
- [GitHub Actions reusable-workflow secret handling](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows#passing-inputs-and-secrets-to-a-reusable-workflow)
- [RFC 6962 `get-entries` response behavior](https://www.rfc-editor.org/rfc/rfc6962#section-4.6)
- [Current signed Sigstore trusted root](https://github.com/sigstore/root-signing/blob/main/targets/trusted_root.json)
- [Current default Sigstore signing configuration](https://github.com/sigstore/root-signing/blob/main/targets/signing_config.v0.2.json)
- [Opt-in Rekor v2 signing configuration](https://github.com/sigstore/root-signing/blob/main/targets/signing_config_rekor_v2.v0.2.json)
- [Fulcio public CT log and monitoring recommendation](https://github.com/sigstore/fulcio#certificate-transparency)
- [Fulcio CT log design and sharding](https://github.com/sigstore/fulcio/blob/main/docs/ctlog.md)
- [Fulcio certificate and precertificate issuance flow](https://docs.sigstore.dev/certificate_authority/certificate-issuing-overview/)
- [Sigstore threat model and monitoring responsibilities](https://docs.sigstore.dev/about/threat-model/)
- [Fulcio OID fields for identity matching](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Rekor v1, Rekor v2, and timestamp authority behavior](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [Rekor v1 API and index-search caveats](https://github.com/sigstore/rekor/blob/main/openapi.yaml)
- [Rekor v2 client and search limitations](https://github.com/sigstore/rekor-tiles/blob/main/CLIENTS.md)

## Conclusion

Continuously and without index gaps scan every relevant Fulcio CT shard for your SANs, issuer, repository, and workflow OIDs; preserve and compare consistency checkpoints; and correlate each logged certificate or precertificate with an approved release ledger and Rekor artifact record. Transparency makes unauthorized issuance detectable only when someone watches and acts on it.
