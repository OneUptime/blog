# Validation Summary: How to Use Dapr with Kubernetes Ephemeral Containers

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — HTTP API, sidecar architecture, actors, pub/sub, state management
- Kubernetes — ephemeral containers, kubectl debug, process namespace sharing, pod networking
- Container images — busybox, nicolaka/netshoot
- Debugging tools — wget, curl, jq, tcpdump, nc, nslookup

## Sources Consulted
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Sidecar Injector overview: https://docs.dapr.io/concepts/dapr-services/sidecar-injector/
- Kubernetes kubectl debug documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Ephemeral Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- BusyBox applet documentation (nc, wget, nslookup)

## Issues Found

### 1. Incorrect label selector for Dapr-enabled pods (line 21)
- **What was wrong:** The command `kubectl get pods -l dapr.io/enabled=true` uses a label selector, but `dapr.io/enabled` is a pod **annotation**, not a label. The `-l` flag only filters by labels, so this command would return no results for Dapr-enabled pods.
- **What was changed:** Replaced with `kubectl get pods` with a comment explaining that Dapr-injected pods show an extra container in the READY column (e.g., 2/2 instead of 1/1).
- **Why:** The Dapr sidecar injector reads annotations to decide whether to inject the sidecar but does not add corresponding labels to pods. There is no standard Dapr label to filter on.

### 2. `python3 -m json.tool` inside busybox container (line 41)
- **What was wrong:** The command `wget -qO- http://localhost:3500/v1.0/metadata | python3 -m json.tool` pipes output to Python3 for JSON formatting, but the busybox:1.36 image does not include Python3 (or any Python). This command would fail with "python3: not found".
- **What was changed:** Removed the `| python3 -m json.tool` pipe, leaving just the raw `wget` output.
- **Why:** BusyBox is a minimal Unix utilities image with no Python runtime. JSON formatting can be done later in the netshoot section using `jq`.

### 3. `nc -zv` flags not supported in busybox (lines 53-56)
- **What was wrong:** The commands `nc -zv redis-master... 6379` and `nc -zv kafka... 9092` use `-z` (scan/zero-I/O mode) and `-v` (verbose) flags, which are not supported by BusyBox's minimal `nc` applet. These are features of GNU netcat or nmap's ncat.
- **What was changed:** Replaced with busybox-compatible `nc -w 2 host port </dev/null && echo "Connected" || echo "Connection failed"` which uses the `-w` (timeout) flag that busybox nc does support.
- **Why:** BusyBox nc only supports a basic set of flags (`-w`, `-l`, `-p`, `-e`). The replacement achieves the same connectivity test by attempting a connection with a 2-second timeout.

## Review Notes
- All Dapr HTTP API endpoints referenced in the post (`/v1.0/healthz`, `/v1.0/metadata`, `/v1.0/actors/<type>/<id>/state/<key>`) are correct and current.
- The `kubectl debug` syntax, `--target` flag, and `--share-processes` flag are all correct.
- The netshoot image section correctly uses `curl` and `jq`, which are available in that image.
- The tcpdump command for capturing loopback traffic on port 3500 is correct.
- The overall approach of using ephemeral containers for Dapr debugging is sound and follows Kubernetes best practices.
- The post could benefit from noting which Kubernetes version is required for ephemeral containers (GA since Kubernetes 1.25), but this is not an error.
