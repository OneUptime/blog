# Validation Summary: How to Use Dapr Longhaul Benchmarks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr-client`)
- Kubernetes (`kubectl`)
- Python (pandas for data analysis)
- Bash scripting (awk, date)

## Sources Consulted
- Dapr Python SDK source code and official examples (https://github.com/dapr/python-sdk) — verified `DaprClient` import, context manager support, `publish_event` method signature and `data_content_type` parameter
- Dapr test infrastructure repository (https://github.com/dapr/test-infra) — verified location of longhaul test apps and Kubernetes manifests
- Dapr main repository (https://github.com/dapr/dapr) — confirmed `tests/apps/longhaul/` does not exist there
- POSIX awk specification — confirmed `strftime` is a gawk extension, not available in mawk or BSD awk
- Kubernetes CLI documentation — verified `kubectl top pods --containers` flag and output format

## Issues Found

1. **Wrong repository for longhaul tests**: The post directed users to clone `dapr/dapr` and navigate to `tests/apps/longhaul/` with `publisher.yaml` and `subscriber.yaml`. This path does not exist. Dapr longhaul tests are in the `dapr/test-infra` repository under `longhaul-test/`. Fixed the clone URL, directory path, and manifest filenames to match the actual repository structure (`streaming-pubsub-publisher.yml`, `streaming-pubsub-subscriber.yml`).

2. **Missing `data_content_type` in `publish_event`**: The `publish_event` call omitted the `data_content_type` parameter while publishing JSON data. All official Dapr Python SDK examples specify `data_content_type="application/json"` when publishing JSON. Without it, the Dapr runtime receives an empty content type, which means CloudEvents envelopes won't have the correct `datacontenttype` and subscribers may not parse the payload correctly. Added `data_content_type="application/json"`.

3. **Non-portable `awk strftime` call**: The monitoring script used `awk '/daprd/ {print strftime(...), $0}'`. `strftime()` is a gawk-only extension and fails on mawk (Debian/Ubuntu default) and BSD awk (macOS). Replaced with a portable approach: capture the timestamp with `date` into a shell variable, then pass it to awk via `-v ts="$ts"`.

4. **Incorrect hour grouping in memory analysis**: The pandas code used `.dt.hour` to extract the hour-of-day (0–23), which incorrectly groups data from different days into the same buckets. For a 72-hour longhaul test, this means hour 0 on day 1 and hour 0 on day 3 would be averaged together, masking any real memory growth trend. Fixed by computing a sequential `hour_bucket` using elapsed seconds from the start of the test divided by 3600. Also added `.dropna()` to the diff result to avoid false positives from the first NaN entry.

## Review Notes
- The connection exhaustion detection commands (`cat /proc/net/tcp`, `ss -s`) assume the `daprd` sidecar container has these utilities available. In production, daprd uses a distroless base image which does not include `cat` or `ss`. These commands would work in test environments with non-distroless images or via `kubectl debug` ephemeral containers. This is acceptable for a testing-focused blog post but worth noting.
- The success criteria YAML file (`success-criteria.yaml`) is illustrative — it is not a recognized Dapr configuration format. This is fine as it is clearly presented as a documentation template rather than an executable config.
- The `-it` flags on `kubectl exec` commands are unnecessary for non-interactive commands and may produce warnings when used in scripts, but they do not cause failures.
