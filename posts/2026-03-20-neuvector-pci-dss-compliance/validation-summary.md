# Validation Summary: How to Set Up NeuVector for PCI DSS Compliance

## Status
validated

## Post Type
Tutorial / Compliance Guide

## Technologies Covered
- NeuVector (REST API, admission control, DLP sensors, registry scanning, syslog integration)
- NeuVector Custom Resource Definitions (`NvClusterSecurityRule`)
- Kubernetes
- CIS Benchmarks
- PCI DSS (Payment Card Industry Data Security Standard)
- bash, curl, jq

## Sources Consulted
- NeuVector source code: https://github.com/neuvector/neuvector
  - `controller/rest/rest.go` (REST endpoint registrations)
  - `share/criteria.go` (admission control criterion keys and operators)
  - `controller/api/apis.go` and `apis.yaml` (API field definitions)
  - `controller/resource/nvsecurityrule_def.go` (CRD definitions)
- NeuVector public docs: https://open-docs.neuvector.com/

## Issues Found

1. **Incorrect admission criterion key for privileged containers.** The post used `"name": "privileged"` to block privileged containers. The correct criterion key in NeuVector is `runAsPrivileged` (per `share/criteria.go`, `CriteriaKeyRunAsPrivileged`). Changed to `runAsPrivileged`.

2. **Incorrect operator string for CVE count comparison.** The post used `"op": "biggerEqualThan"` which is the Go constant *name* but not the wire-level value. The actual on-the-wire JSON value is `">="` (per `share/criteria.go`, `CriteriaOpBiggerEqualThan = ">="`). Changed to `">="`.

3. **Incorrect DLP sensor endpoint.** The post used `/v1/dpi/dlp/sensor`, but the actual registered route is `/v1/dlp/sensor` (no `dpi/` prefix). Changed both occurrences.

4. **Incorrect CIS benchmark endpoint.** The post used `/v1/bench/host/all`, which does not exist. NeuVector exposes per-host benchmark endpoints at `/v1/bench/host/{id}/docker` and `/v1/bench/host/{id}/kubernetes`. Replaced with `/v1/bench/host/${HOST_ID}/kubernetes` and added a comment explaining the host ID substitution.

5. **Incorrect workload scan list endpoint.** The post used `/v1/scan/workload?start=0&limit=1000` which does not exist as a list endpoint (only `/v1/scan/workload/:id` exists for individual reports). The correct way to enumerate workloads with their CVE counts is `GET /v1/workload`, which returns workloads with an embedded `scan_summary` object. Updated the report script accordingly.

6. **CVE field naming in jq report.** The original jq used `.workloads[].critical` and `.workloads[].high` directly on workloads. The NeuVector `RESTScanBrief` schema exposes `high` and `medium` fields under `scan_summary` only (critical CVEs are folded into the `high` count). Updated the jq path to `.workloads[].scan_summary.high`/`.scan_summary.medium` and added a comment noting that critical is folded into high.

## Review Notes

- The credit card regex patterns in the DLP sensor are reasonable for basic detection but do not cover newer Mastercard 2-series BINs (2221–2720) introduced in 2017. This is a content omission rather than a technical error, so it was left as-is.
- The PCI DSS requirement mappings (Req 6.3 → "Protect web-facing applications") are slightly imprecise relative to the latest PCI DSS v4.0 wording, but the spirit of the mapping is correct. Left unchanged.
- The post uses NeuVector's REST API directly with `X-Auth-Token`. Token acquisition via `/v1/auth` is implied as a prerequisite — readers unfamiliar with NeuVector may need to consult the auth flow separately.
- The `nv.ip.ext: ""` selector pattern used for "external" egress in the network rule is a NeuVector convention for matching external IPs and is correctly applied.
