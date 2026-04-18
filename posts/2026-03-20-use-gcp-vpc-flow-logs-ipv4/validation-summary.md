# Validation Summary: How to Use GCP VPC Flow Logs to Monitor IPv4 Traffic

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Google Cloud Platform (GCP)
- VPC Flow Logs
- gcloud CLI (compute networks subnets, logging, logging sinks)
- Cloud Logging
- BigQuery (log sink + SQL)
- Python 3 (port-scan analysis script)

## Sources Consulted
- [VPC Flow Logs overview](https://docs.cloud.google.com/vpc/docs/flow-logs)
- [About VPC Flow Logs records](https://docs.cloud.google.com/vpc/docs/about-flow-logs-records) (record schema, CEL filter syntax, `inIpRange`)
- [Configure VPC Flow Logs](https://docs.cloud.google.com/vpc/docs/using-flow-logs) (gcloud flags)
- [gcloud compute networks subnets update reference](https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update)
- [gcloud logging sinks create reference](https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create)

## Issues Found
1. **Protocol coverage incorrect.** The intro claimed flow logs only sample TCP and UDP. Per current GCP docs, VPC Flow Logs sample TCP, UDP, ICMP, ESP, and GRE. Updated the sentence to list all five.
2. **Invalid CEL in `--logging-filter-expr`.** The example `(src_ip != "169.254.0.0/16")` is not a valid filter expression on two counts: (a) record fields must be referenced as `connection.src_ip`, not bare `src_ip`; (b) you cannot compare an IP to a CIDR with `!=` — CIDR membership requires `inIpRange()`. Replaced with `!inIpRange(connection.src_ip, "169.254.0.0/16")`.
3. **BigQuery SQL referenced wrong field paths.** `jsonPayload.src_ip`, `jsonPayload.dest_ip`, and `jsonPayload.dest_port` do not exist — these fields live under the nested `connection` object. Updated to `jsonPayload.connection.src_ip` / `.dest_ip` / `.dest_port`.
4. **Python port-scan script used wrong field paths.** `p.get('src_ip', ...)` / `p.get('dest_port', ...)` would silently return empty strings because those keys live under `connection`. Added `c = p.get('connection', {})` and read `src_ip`/`dest_port` from `c`.
5. **Flow Log Fields table mislabeled connection fields.** Updated the rows for `src_ip`, `src_port`, `dest_ip`, `dest_port`, and `protocol` to use the correct `connection.<field>` path.

## Review Notes
- The default `--logging-flow-sampling` for the Compute Engine subnet API is 0.5, matching the post's claim. (The Network Management API uses 1.0 by default — not relevant here.)
- The BigQuery sink wildcard pattern `compute_googleapis_com_vpc_flows_*` is correct for the default date-sharded export tables. If the sink were created with `--use-partitioned-tables`, the table name would be `compute_googleapis_com_vpc_flows` (no suffix). Worth noting in a future revision.
- `--logging-aggregation-interval=INTERVAL_5_SEC` and `--logging-metadata=INCLUDE_ALL_METADATA` are valid enum values per the gcloud reference.
- The IANA protocol numbers (6=TCP, 17=UDP) are correct.
- The post focuses on IPv4 but the same record format applies to IPv6 flow logs (with IPv6 addresses in `connection.src_ip`/`dest_ip`); not a defect for an IPv4-titled post.
