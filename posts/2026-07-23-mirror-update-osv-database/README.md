# How to Download, Mirror, and Incrementally Update the OSV Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV.dev, Vulnerability Database, Data Mirror, GCS, Incremental Sync

Description: Build a reproducible OSV mirror from full exports and `modified_id.csv` while retaining withdrawn records and source metadata.

---

OSV.dev continuously exports its aggregated data to the public `gs://osv-vulnerabilities` bucket. You can download one full archive, mirror selected ecosystems, or use modification indexes to update an existing mirror efficiently.

## Choose the right export

The bucket exposes three useful layouts:

| Need | Object |
|---|---|
| Complete database | `all.zip` |
| Complete ecosystem | `<ECOSYSTEM>/all.zip` |
| One record | `<ECOSYSTEM>/<ID>.json` |

The complete archive includes withdrawn records:

```bash
curl -fL \
  https://storage.googleapis.com/osv-vulnerabilities/all.zip \
  -o all.zip &&
  unzip -q all.zip -d osv-snapshot
```

For PyPI only:

```bash
curl -fL \
  https://storage.googleapis.com/osv-vulnerabilities/PyPI/all.zip \
  -o PyPI-all.zip
```

The same objects are available with `gcloud storage cp`, for example:

```bash
gcloud storage cp gs://osv-vulnerabilities/PyPI/all.zip .
```

Use the public `ecosystems.txt` object rather than hard-coding an ecosystem list:

```bash
curl -fsSL \
  https://storage.googleapis.com/osv-vulnerabilities/ecosystems.txt
```

## Understand ecosystem directories

Some schema ecosystem values contain a release suffix, such as `Alpine:v3.17`. Data dumps place all prefixed variants under the base directory, such as `Alpine`.

OSV.dev's data documentation says it has stopped exporting separate entries for ecosystem prefixes; use the main ecosystem directory without the `:...` suffix. The JSON record itself retains the precise ecosystem value needed for matching.

Records without an ecosystem—often withdrawn records—are exported under `[EMPTY]`. Do not discard that directory if the mirror must preserve lifecycle state and historical IDs.

## Bootstrap atomically

Download and validate a candidate snapshot outside the live mirror path:

```bash
set -euo pipefail

candidate_dir=$(mktemp -d)
curl -fL \
  https://storage.googleapis.com/osv-vulnerabilities/all.zip \
  -o "${candidate_dir}/all.zip"
unzip -t "${candidate_dir}/all.zip"
unzip -q "${candidate_dir}/all.zip" -d "${candidate_dir}/data"
```

Before promoting it, parse every JSON file, verify each has `id` and `modified`, and reject duplicate IDs with conflicting content. Keep the previous snapshot until the new index is complete. The export is source data; your searchable database should be rebuilt or updated transactionally so readers never see a partially extracted archive.

## Consume the modification index

The bucket provides:

- top-level `modified_id.csv` for all ecosystems;
- `<ECOSYSTEM>/modified_id.csv` for one ecosystem.

Top-level rows have this shape:

```text
2026-07-23T08:30:00Z,PyPI/PYSEC-2026-1234
2026-07-23T08:29:00Z,Go/GO-2026-5678
```

Per-ecosystem rows omit the directory prefix. The files are documented as sorted in reverse chronological order. However, the current exporter formats timestamps with variable-length fractional seconds and sorts those strings, so rows within one second can be slightly out of chronological order. Parse the full CSV and select every row newer than your overlap boundary rather than stopping at the first timestamp you have processed.

```bash
curl -fsSL \
  https://storage.googleapis.com/osv-vulnerabilities/modified_id.csv \
  -o modified_id.csv
```

For each new row, fetch `<path>.json` from the bucket and upsert by record `id`:

```text
base URL + "/" + ecosystem-and-id + ".json"
```

Treat the CSV path as data: validate its expected ecosystem/ID form and URL-encode path segments in a real client.

## Use an overlap window

A timestamp-only high-water mark can miss records when multiple entries share the same modification time or when a run stops midway. Store both the last completed run state and record timestamps, then intentionally refetch a small overlap.

For every candidate record:

1. Parse the JSON before opening a transaction.
2. Locate the existing row by `id`.
3. Parse the RFC 3339 `modified` timestamps and compare instants, not timestamp strings.
4. Replace only with a newer record, or verify equality if timestamps match.
5. Preserve `withdrawn` state.
6. Update affected-package and alias indexes in the same transaction.

The OSV schema says that the later `modified` entry for one ID is authoritative. Alias enrichment can update this field even when upstream prose has not changed.

## Reconcile with periodic full snapshots

Incremental synchronization should be paired with periodic full downloads. A full comparison catches client bugs, records missed by earlier incremental runs, and lifecycle edge cases.

Do not infer deletion because an ID is absent from the rows newer than your high-water mark; that slice lists changes, not the entire database. The current exporter rebuilds the complete CSV from every exported vulnerability, but the CSV does not emit deletion events, so reconcile removals against the periodic full snapshot. Also account for OSV.dev's current source-specific deletion behavior: explicit withdrawals are retained, GCS deletions are converted to withdrawals, and Git or REST deletions may currently leave orphaned records.

A useful mirror audit records:

- export URL, retrieval time, and object generation or checksum;
- last successfully processed modification point;
- counts by ecosystem and withdrawn state;
- rejected or unparsable records;
- source `id` and `modified` values;
- the mirror software version.

This turns the mirror into a reproducible data product rather than a directory of untracked JSON files.

## Official Documentation

- [OSV.dev data sources and data dumps](https://google.github.io/osv.dev/data/)
- [OSV.dev FAQ: database download and recent changes](https://google.github.io/osv.dev/faq/)
- [Public OSV vulnerability bucket](https://storage.googleapis.com/osv-vulnerabilities/index.html)
- [OpenSSF OSV schema: ID and modified fields](https://ossf.github.io/osv-schema/)
