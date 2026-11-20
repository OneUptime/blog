# Validation summary

## Checks

Read-only shell example passed bash syntax checking. Checked all five Mermaid nodes and four edge references structurally. Reviewed metric types and units against the official reference, including seconds for nsup_cycle_duration versus milliseconds for the log field total-ms. Reviewed read visibility, cleanup configuration, replica-count scope, and retained index memory. Generated and visually inspected the 1280x720 social image with no title clipping.

## Limitations

No Aerospike server, monitoring exporter, or asinfo calls were executed. The diagram was structurally checked but not browser-rendered. The staging observation sequence is guidance, not measured expiry or storage behavior.

## Sources

- https://support.aerospike.com/hc/en-us/articles/49939338965915-Is-TTL-checked-on-a-read
- https://aerospike.com/docs/database/manage/namespace/retention/
- https://aerospike.com/docs/database/reference/metrics/
- https://aerospike.com/docs/database/reference/info/
- https://aerospike.com/docs/database/reference/config/
- https://aerospike.com/docs/database/reference/logs/
- https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/policy/Policy.java
- https://support.aerospike.com/hc/en-us/articles/56255268033051-Why-doesn-t-system-memory-usage-go-down-after-records-expire-or-are-deleted

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
