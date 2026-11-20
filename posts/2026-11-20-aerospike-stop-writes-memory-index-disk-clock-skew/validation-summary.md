# Validation summary

## Checks

Both command blocks passed Bash syntax checks. Parsed the asadm 5.2.0 command controller and its delegated namespace formatter to verify the for filter, index budget handling, and clock threshold fields. Reviewed current server documentation for container memory accounting and replaced generic clock assumptions with running-server evidence. Reviewed scope and units in the threshold table. Generated and visually reviewed the 1280x720 social image; no text clipping.

## Limitations

No live asadm, asinfo, database write, or stop-writes recovery was executed. Source inspection is not a cluster compatibility test. The storage percentages are explicitly hypothetical. Operator verification must include all relevant nodes and configured storage types.

## Sources

- https://aerospike.com/docs/database/reference/config/
- https://aerospike.com/docs/database/tools/asadm/live-mode/#stop-writes
- https://github.com/aerospike/aerospike-admin/blob/5.2.0/lib/live_cluster/show_controller.py
- https://aerospike.com/docs/database/reference/info/
- https://aerospike.com/docs/database/observe/key-metrics/
- https://support.aerospike.com/hc/en-us/articles/56255268033051-Why-doesn-t-system-memory-usage-go-down-after-records-expire-or-are-deleted
- https://aerospike.com/docs/database/reference/config/#stop-writes-sys-memory-pct
- https://aerospike.com/docs/database/reference/metrics/
- https://aerospike.com/docs/database/manage/namespace/consistency/
- https://aerospike.com/docs/database/reference/config/#stop-writes-avail-pct
- https://github.com/aerospike/aerospike-admin/blob/5.2.0/lib/utils/common.py

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
