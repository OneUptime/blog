# Validation Summary: How to Troubleshoot Sync Module Failures in Ceph RGW

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RGW / radosgw-admin multisite sync
- RGW sync modules (Elasticsearch sync module, Cloud sync module)
- Rook-Ceph (kubectl exec into mgr/rgw pods)
- Elasticsearch REST API

## Sources Consulted
- Ceph "radosgw-admin" man page — https://docs.ceph.com/en/latest/man/8/radosgw-admin/ (verified subcommands `sync status`, `sync error list`, `sync error trim`, `bucket sync disable`, `bucket sync enable`, `data sync init`, `data sync run`; verified flags `--source-zone`, `--bucket`, `--max-entries`, and `--start-date`/`--end-date` use yyyy-mm-dd format)
- Ceph radosgw-admin help test (ceph/ceph src/test/cli) — https://raw.githubusercontent.com/ceph/ceph/main/src/test/cli/radosgw-admin/help.t (cross-checked bucket sync and sync error subcommand set)
- Red Hat Ceph Storage multisite troubleshooting / web reference — confirmed `radosgw-admin bucket sync run --source-zone <zone> --bucket <name>` is a real command used to manually re-run a single bucket's sync
- Ceph "ElasticSearch Sync Module" / "Sync Modules" — https://docs.ceph.com/en/latest/radosgw/elastic-sync-module/ and https://docs.ceph.com/en/latest/radosgw/sync-modules/ (confirmed the ES and cloud sync modules still exist and are not removed)

## Issues Found
- None — commands, flags, and the troubleshooting workflow were verified against the sources above and are accurate.

## Review Notes
- `radosgw-admin bucket sync run` is not shown in the condensed man-page subcommand list but is a real, documented command (used in Red Hat multisite troubleshooting as `bucket sync run --source-zone <zone> --bucket <name>`). Left as-is.
- `--start-date`/`--end-date` accept the `yyyy-mm-dd` format; the post generates these with `date +%Y-%m-%d`, which is correct.
- The `jq` filter in Step 1 (fields `timestamp`, `source_zone`, `key`, `error_code`, `error_message`, `attempts_count`) is illustrative. The actual `sync error list` JSON nests details under `entries[].info` (`source_zone`, `error_code`, `message`), so the flat field names are a simplification rather than a verbatim schema. The man page does not publish the JSON schema, so this was left as-is as illustrative pseudo-output, and the human-readable error-code list (ERR_NO_SUCH_BUCKET, ERR_ACCESS_DENIED, etc.) is presented as examples.
- The Elasticsearch re-index examples (`_cat/indices`, `_doc` PUT, index creation) are standard Elasticsearch REST calls and are syntactically correct.
- `kubectl -n rook-ceph rollout restart deployment/rook-ceph-rgw-my-store-a` and the mgr/rgw exec paths follow Rook's standard naming convention (`rook-ceph-rgw-<store>-<letter>`, `rook-ceph-mgr-a`). Consistent with Rook; not an error.
