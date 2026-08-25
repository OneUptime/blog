# How to Monitor Fulcio’s Certificate Transparency Log for Unauthorized Certificates for Your Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, Certificate Transparency, Rekor Monitor, GitHub Actions, Incident Detection, Supply Chain Security

Description: Continuously scan Fulcio CT shards for email, workflow, issuer, and OID matches, preserve checkpoints, reconcile every issuance with an authorized release, and respond to unexpected certificates.

---

Fulcio's certificate-transparency (CT) log makes issuance visible; it does not decide whether an issuance was authorized. Identity owners must monitor for their SANs and CI metadata, then reconcile every match with an expected signing event.

Sigstore's `rekor-monitor` repository now builds two binaries: `rekor_monitor` for the Rekor signature log and `ct_monitor` for Fulcio certificate logs. The current CT matching path handles certificate SAN/issuer pairs and Fulcio OID extension values while also checking log consistency. Although the shared configuration format also defines generic subjects and fingerprints for Rekor monitoring, current CT v1 and v2 matching code does not process those matcher types.

## Monitor Both Identity and Log Integrity

There are two distinct detection goals:

- **Identity monitoring:** find every certificate containing your email, workflow URI, repository URI, or other governed identity and classify it as expected or unexpected.
- **Consistency monitoring:** verify append-only evolution and compare checkpoints so a log operator cannot quietly remove or rewrite entries without detection.

A matching certificate is not automatically malicious. A normal release should produce one. Conversely, a successful consistency check does not mean every certificate was authorized. Run both checks and retain their state.

## Define Exact Monitored Values

Create a configuration that covers the entire identity namespace you own:

```yaml
# Initial historical backfill only; remove after the checkpoint is established.
startIndex: 0

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

outputIdentities: identities.json
outputIdentitiesFormat: json
```

`certSubject` and `issuers` are regular expressions, so anchor them with `^` and `$` and escape literal dots. Named Fulcio extension values are exact string matches, not regexes. Use an OID matcher when a reusable workflow makes the SAN point to a central signer but the Source Repository or Build Config URI identifies your repository.

`startIndex: 0` makes this first run search the existing shard, and `outputIdentities` preserves the matches for review. Remove `startIndex` after the backfill and retain the generated checkpoint for incremental runs. If neither an explicit start index nor a prior checkpoint exists, current monitor code only saves the current checkpoint on its first run; it does not search historical entries. Leaving `startIndex: 0` in a recurring configuration rescans the whole shard each time.

GitHub's correct OIDC issuer is `https://token.actions.githubusercontent.com`. Do not substitute GitHub's interactive-login issuer or shorten this to a look-alike `token.actions.github.com` hostname.

For a reusable workflow, monitor at least:

- the Build Signer URI of the central reusable workflow;
- your Source Repository URI;
- your Build Config URI; and
- the GitHub issuer.

That combination catches certificates for your source repository even when the certificate SAN is shared across many callers of a centralized signer.

## Run `ct_monitor` Directly

Build the official project at a reviewed commit or use a verified release artifact:

```bash
git clone https://github.com/sigstore/rekor-monitor.git
cd rekor-monitor
git checkout 56b05695c67ddb0422a084ecd43c0ca537ddd1a9
make build

./ct_monitor \
  --url https://ctfe.sigstore.dev/test \
  --config-file ../ct-config.yaml
```

The public log URL is versioned deployment data. Fulcio's current repository documents `https://ctfe.sigstore.dev/test`, while `ct_monitor` and older examples still default to or demonstrate the frozen `2022` shard. Always pass an explicit URL obtained from current official Sigstore trusted configuration or deployment documentation; do not rely on the monitor's compiled default.

Fulcio's architecture permits periodic sharding. Monitor every shard that can contain a still-trusted certificate, including frozen historical shards. A monitor attached only to the newest shard cannot discover an older unauthorized issuance that predates its start.

## Schedule the Official Reusable Workflow

The official repository provides a CT-specific reusable workflow. Pin it to a reviewed commit rather than `@main`:

```yaml
name: Fulcio CT identity monitor

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
      url: https://ctfe.sigstore.dev/test
      config: |
        monitoredValues:
          certIdentities:
            - certSubject: '^release-bot@example\.com$'
              issuers:
                - '^https://accounts\.google\.com$'
            - certSubject: '^https://github\.com/acme/widget/\.github/workflows/release\.yml@.*$'
              issuers:
                - '^https://token\.actions\.githubusercontent\.com$'
          oidMatchers:
            fulcioExtensions:
              source-repository-uri:
                - https://github.com/acme/widget
```

The official project recommends hourly monitoring. Set artifact retention longer than the schedule interval because the workflow uses retained state to continue consistency checks. Its first run has no retained checkpoint, so this example starts watching new entries from that checkpoint onward; perform and preserve a separate explicit-index backfill if historical coverage is required. For a high-assurance release program, store checkpoints and findings outside a single GitHub repository as well; an attacker who compromises the repository should not be able to erase the monitor and its only history.

The reusable workflow's `file_issue` option reports monitor health—success or failure—not identity matches. Its base workflow uploads the checkpoint, not an `outputIdentities` file. To receive findings, run `ct_monitor` in a custom wrapper that securely supplies one of its supported notification integrations, or configure `outputIdentities` and explicitly persist and reconcile that file. Do not embed a personal access token in inline workflow configuration. “Unauthorized” remains an organizational judgment, so treat every new match as pending until it corresponds to an approved release record.

## Reconcile Matches with an Authorization Ledger

For each expected signing event, record before or during release:

- artifact digest;
- exact SAN and issuer;
- expected Build Signer and Build Config URI/digest;
- source repository digest and ref;
- GitHub run ID and attempt;
- release approval or protected environment; and
- expected time window.

When the monitor finds a certificate, compare its serial/fingerprint and extension tuple with this ledger. Alert when:

- no approved release exists;
- the signer or build-config digest is not reviewed;
- the source commit differs from the built artifact record;
- the runner environment is forbidden;
- the trigger or ref is unexpected;
- a run attempt occurs after the release was closed; or
- the same identity appears at an unusual rate.

Do not suppress all certificates from an approved SAN. An attacker with the same compromised workflow identity would deliberately use the expected SAN; immutable digests, run invocation, timing, and artifact records provide the discrimination.

## Monitor Rekor Too

Fulcio CT tells you that a certificate was issued. Rekor tells you which artifact digest and signature were logged with a certificate. Run `rekor_monitor` alongside `ct_monitor` so an incident responder can link unexpected issuance to possible signed artifacts.

The logs are complementary:

| Signal | Fulcio CT | Rekor |
| --- | --- | --- |
| certificate issued | yes | certificate can be present with a signing entry |
| artifact digest and signature | no | yes |
| embedded SCT / certificate auditability | yes | not its primary role |
| signed integrated time for signing event | no | yes |

An unauthorized Fulcio certificate with no observed Rekor artifact is still an incident: it may have been used offline, logged later, or issued as a probe.

## Respond to an Unexpected Certificate

1. Preserve the CT entry, certificate DER, fingerprint, log checkpoint, and monitor output.
2. Search Rekor for the certificate, key fingerprint, identity, and related artifact entries.
3. Disable the affected OIDC principal or workflow and revoke its ability to request new tokens.
4. Inspect the GitHub or CI run URI, commit, workflow digests, runner type, and audit log.
5. Block or retract affected artifact digests through consumer policy and release channels.
6. Rotate compromised non-ephemeral credentials and repair branch, environment, or runner controls.
7. Continue monitoring; the public certificate cannot be deleted, and recurrence provides useful evidence.

Fulcio certificates are short-lived and normally avoid certificate revocation. Incident containment therefore depends on stopping new identity tokens and making verifiers reject unauthorized artifacts or signer revisions, not waiting for a ten-minute leaf to disappear from the log.

## Official Documentation

- [Sigstore Rekor and CT monitor repository](https://github.com/sigstore/rekor-monitor)
- [Official CT reusable monitoring workflow](https://github.com/sigstore/rekor-monitor/blob/main/.github/workflows/ct_reusable_monitoring.yml)
- [Monitor loop, first-run checkpoint, and identity notification behavior](https://github.com/sigstore/rekor-monitor/blob/main/internal/cmd/common.go)
- [Current CT v1 identity matcher implementation](https://github.com/sigstore/rekor-monitor/blob/main/pkg/ct/v1/monitor.go)
- [Reusable workflow checkpoint and `file_issue` implementation](https://github.com/sigstore/rekor-monitor/blob/main/.github/workflows/base_monitoring.yml)
- [Fulcio public CT log and monitoring recommendation](https://github.com/sigstore/fulcio#certificate-transparency)
- [Fulcio CT log design and sharding](https://github.com/sigstore/fulcio/blob/main/docs/ctlog.md)
- [Sigstore threat model and monitoring responsibilities](https://docs.sigstore.dev/about/threat-model/)
- [Fulcio OID fields for identity matching](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)

## Conclusion

Continuously scan every relevant Fulcio CT shard for your SANs, issuer, repository, and workflow OIDs; preserve consistency checkpoints; and correlate each new certificate with an approved release ledger and Rekor artifact record. Transparency makes unauthorized issuance detectable only when someone watches and acts on it.
