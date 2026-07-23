# How OSV Handles Withdrawn, Deleted, and Updated Vulnerability Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV.dev, Advisory Lifecycle, Vulnerability Database, Data Synchronization

Description: Handle OSV record withdrawals, upstream deletions, enrichment updates, and mirror synchronization without leaving stale findings.

---

OSV records have a lifecycle, and “not returned by a package query” does not necessarily mean “deleted.” Consumers need to distinguish an explicit withdrawal, an upstream deletion, and a normal update because OSV.dev treats them differently.

## A withdrawal is an explicit record state

The OSV schema's optional `withdrawn` field is an RFC 3339 UTC timestamp:

```json
{
  "id": "x_CUSTOM-0001",
  "modified": "2026-07-23T09:30:00Z",
  "withdrawn": "2026-07-23T09:30:00Z",
  "summary": "Withdrawn because this record duplicates x_CUSTOM-0002"
}
```

If the field is absent, the record is not withdrawn. The schema says the withdrawal rationale should go in the summary.

OSV.dev documents the visibility rules clearly. A withdrawn record is excluded from:

- `POST /v1/query` and `POST /v1/querybatch` vulnerability matches;
- the main list page;
- related search results.

It is still:

- returned by `GET /v1/vulns/{id}`;
- shown on its vulnerability page with a withdrawn marker;
- included in GCS exports with the `withdrawn` timestamp.

This preserves an audit trail and prevents the ID from silently changing meaning.

## An upstream deletion is not automatically the same

OSV.dev's current behavior depends on the source transport:

| Import source | Current handling when upstream removes a record |
|---|---|
| GCS | Mark the OSV.dev record withdrawn |
| REST | Leave the existing record valid but orphaned |
| Git | Leave the existing record valid but orphaned |

For GCS sources, OSV.dev also has a safety threshold: if more than 10% of records are about to be marked withdrawn, the operation aborts. This protects against a broken or incomplete feed appearing to delete a large part of the database.

The FAQ notes that REST and Git deletion behavior is intended to change to match GCS, but consumers must implement the documented current behavior, not the planned one. A record disappearing from a Git source therefore does not guarantee it immediately disappears or becomes withdrawn in OSV.dev.

## Updates are selected by ID and modified time

`id` and `modified` are required fields. The schema states that when two entries claim the same ID, the entry with the later modification time is authoritative.

Changes can originate in the source or in OSV.dev enrichment. OSV.dev may:

- enumerate affected package versions;
- enumerate affected Git commits and map commits to tags;
- compute a purl;
- recompute aliases.

Its FAQ explicitly notes that alias changes update `modified`. Consumers should not assume that only prose or fix ranges trigger a new timestamp.

## Synchronize a mirror safely

The exported database includes top-level and per-ecosystem `modified_id.csv` files, sorted newest first. A robust incremental mirror should:

1. Store a high-water timestamp plus a small overlap window.
2. Stream `modified_id.csv` until reaching records older than that window.
3. Refetch every listed JSON record.
4. Upsert by `id` only when the incoming `modified` value is newer than the stored value.
5. Preserve and process `withdrawn` records rather than filtering them during ingestion.
6. Recompute alias groups when affected records change.

Do not model a withdrawn record as a hard database delete. You need its ID, timestamp, and rationale to close findings and explain why historical scans differed.

The full `all.zip` export includes withdrawn records, and records without an ecosystem—often withdrawn records—are exported under `[EMPTY]`. A mirror that only downloads currently used ecosystem directories can miss lifecycle state for a record whose affected package data was removed.

## Update downstream findings deterministically

When a newer record arrives:

- if `withdrawn` is set, stop presenting it as an active package match, but retain scan and ticket history;
- if affected ranges changed, rematch all inventory instances for that advisory;
- if aliases changed, merge or split the downstream presentation cautiously while retaining external IDs;
- if only details or references changed, update context without reopening a remediated package instance unless applicability changed.

Never close a finding merely because one incremental download did not mention its ID. Incremental feeds list changes; they are not complete snapshots. Close it only after fetching authoritative state and observing a withdrawal or a changed affected set that excludes the installed version.

## Investigate conflicting observations

Use direct GET to establish record state:

```bash
curl -sS https://api.osv.dev/v1/vulns/ADVISORY-ID \
  | jq '{id, modified, withdrawn, summary, affected}'
```

Then inspect the OSV.dev page's Source and Import Source links. If the source deleted a Git or REST record, the OSV.dev copy may currently be orphaned. If the source published an explicit withdrawn record, the GET response should retain that state even though package queries no longer return it.

Lifecycle fidelity is part of vulnerability accuracy. Keeping tombstone-like withdrawals, source provenance, and modification timestamps makes historical reports explainable and prevents stale advisories from lingering indefinitely in your own system.

## Official Documentation

- [OpenSSF OSV schema: modified and withdrawn fields](https://ossf.github.io/osv-schema/)
- [OSV.dev FAQ: withdrawn and deleted record behavior](https://google.github.io/osv.dev/faq/)
- [OSV.dev data exports and incremental change files](https://google.github.io/osv.dev/data/)
- [OSV.dev GET vulnerability endpoint](https://google.github.io/osv.dev/get-v1-vulns/)

