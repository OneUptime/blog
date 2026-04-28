# Validation Summary: How to Configure NeuVector Packet Capture

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- NeuVector (container security platform)
- NeuVector Sniffer / Packet Capture REST API
- Kubernetes containers / workloads
- tcpdump
- tshark / Wireshark
- jq
- Bash scripting
- PCAP file format

## Sources Consulted
- [NeuVector REST API and Automation docs](https://open-docs.neuvector.com/automation/automation/)
- [NeuVector source - controller/api/apis.go (RESTSniffer structs)](https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.go)
- [NeuVector source - controller/rest/rest.go (route definitions)](https://raw.githubusercontent.com/neuvector/neuvector/main/controller/rest/rest.go)
- [NeuVector packet capture issue #973 (file size limits)](https://github.com/neuvector/neuvector/issues/973)
- [NeuVector CLI documentation](https://open-docs.neuvector.com/tronubleshooting/cli/)

## Issues Found

The original post used fabricated REST API endpoints that do not exist in NeuVector. Verified the correct endpoints against NeuVector's source code in `controller/rest/rest.go` and the `RESTSnifferArgs` / `RESTSnifferInfo` struct definitions in `controller/api/apis.go`.

1. **Wrong endpoint path for starting/getting/stopping captures.** The post used `/v1/packet/workload/{id}` for all sniffer operations. NeuVector has no such routes. Replaced with the actual `/v1/sniffer` endpoints:
   - `POST /v1/sniffer?f_workload={workload_id}` to start
   - `GET /v1/sniffer/{sniffer_id}` to read status
   - `GET /v1/sniffer?f_workload={workload_id}` to list
   - `PATCH /v1/sniffer/stop/{sniffer_id}` to stop (the post had used `DELETE` to stop)
   - `DELETE /v1/sniffer/{sniffer_id}` to delete the record
   - `GET /v1/sniffer/{sniffer_id}/pcap` to download

2. **Wrong request body shape.** The post wrapped the request in `{"options": {...}}`. The actual body wrapper is `{"sniffer": {...}}` per `RESTSnifferArgsData`.

3. **Invented `snaplen` parameter.** `RESTSnifferArgs` only exposes `file_number`, `duration`, and `filter`. Removed `snaplen` everywhere it appeared and added `file_number` (required for file rotation, max 50) and surfaced the `filter` BPF expression option instead. Also corrected the UI configuration list in Step 1 to match the real settings.

4. **Confusion of workload ID with sniffer ID.** The post downloaded/stopped captures using the workload ID in the URL, but the API uses a separate sniffer ID returned in the `POST /v1/sniffer` response (`{"result": {"id": "..."}}`). Reworked the examples to capture the returned ID into a `SNIFFER_ID` variable and use it in subsequent calls. Updated the tcpdump/tshark filenames in Step 5 to match.

5. **Wrong status response field names.** The status check used `.capture_status`, `.capture_file_size`, `.capture_duration`, none of which exist. The actual `RESTSnifferInfo` JSON fields are `id`, `status`, `size`, `start_time`, `stop_time`, `file_number`, `enforcer_id`, `container_id`, and `args`. Updated the `jq` filter to read these correctly and to drill into the `.sniffer` wrapper from `RESTSnifferData`.

6. **Wrong events endpoint.** Step 8 used `/v1/event?type=security`, which is not a route. Replaced with `/v1/log/security` (which returns incidents, threats, and violations as documented in `rest.go`) and updated the `jq` filter to merge those three arrays before filtering by `workload_id`.

7. **Wrong scan report endpoint.** Step 8 used `/v1/scan/workload/{id}/report`. The real route is `GET /v1/scan/workload/{id}`.

## Review Notes
- The tcpdump/tshark commands and BPF expressions are syntactically valid and standard.
- NeuVector's UI defaults (per upstream docs) limit the per-capture size to about 10MB across rotated files; users hitting larger captures should adjust `file_number` (max 50, ~100MB total) and/or `filter` to narrow traffic.
- PCAP files on the Enforcer are written under `/var/neuvector/pcap`; for direct on-host access (rather than via the Manager API), the Enforcer container's volume must be mapped — worth mentioning if a future revision wants to cover the off-band download path.
- The auth header (`X-Auth-Token`) and Manager port (`8443`) are correct.
- The `sleep 305` in Step 8 assumes the capture finishes before the download — for long captures, polling `GET /v1/sniffer/{id}` until `status == "stopped"` would be more robust, but the current example is fine for a tutorial.
