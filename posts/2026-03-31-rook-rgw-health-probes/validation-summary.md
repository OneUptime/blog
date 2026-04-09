# Validation Summary: How to Set Up Health Probes for RGW in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway)
- Kubernetes health probes (liveness, readiness, startup)
- CephObjectStore CRD

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-store-crd/
- Rook CRD Specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Rook RGW readiness probe design discussion: https://github.com/rook/rook/issues/8407
- Rook RGW health checker revision: https://github.com/rook/rook/issues/11031
- Rook RGW health probe response code handling: https://github.com/rook/rook/issues/11286
- Rook source code (types.go): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook RGW health check implementation commit: https://github.com/rook/rook/commit/e4eaa91ede7fba5a93dcf6710d83c9c1ebd3d34f

## Issues Found

### 1. `healthCheck` placed at wrong YAML nesting level (Critical)
**What was wrong:** All YAML examples placed `healthCheck` directly under `spec` (i.e., `spec.healthCheck`). The correct location is `spec.gateway.healthCheck` — it must be nested under the `gateway` section.
**What was changed:** Moved `healthCheck` under `gateway` in the full CRD example, the customization snippet, and the debugging snippet. Updated all text references from `healthCheck` to `gateway.healthCheck`.

### 2. Description incorrectly mentioned "liveness" probes
**What was wrong:** The post description said "liveness and readiness health probes," but Rook does not expose a configurable liveness probe for RGW in the CephObjectStore CRD. The CRD only exposes `startupProbe` and `readinessProbe`.
**What was changed:** Changed "liveness and readiness" to "startup and readiness" in the description.

### 3. Introduction overstated the role of liveness probes for RGW
**What was wrong:** The intro bullet for liveness probes said "making liveness probes critical," which contradicts the rest of the post explaining that Rook intentionally does not use HTTP-based liveness probes for RGW. Rook uses a TCP socket liveness check internally, not a configurable HTTP-based one.
**What was changed:** Rewrote the liveness probe bullet to clarify that Rook uses a TCP socket check (not an HTTP probe) for liveness, and added a startup probe bullet since that is one of the two configurable probe types.

### 4. Liveness probe explanation was incomplete
**What was wrong:** The post stated Rook "does not implement a liveness probe for RGW," which is not fully accurate. Rook does implement a TCP socket liveness probe internally — it just doesn't expose an HTTP-based configurable liveness probe in the CRD.
**What was changed:** Clarified throughout the post that Rook internally uses a TCP socket liveness check but does not expose a configurable `livenessProbe` in the CRD's `healthCheck` section.

### 5. Monitoring command missed Startup probe
**What was wrong:** The `kubectl describe` grep command filtered for `Liveness|Readiness` but omitted `Startup`, even though startup probes are a key feature discussed in the post.
**What was changed:** Added `Startup` to the grep pattern: `grep -A5 "Liveness\|Readiness\|Startup"`.

### 6. Summary section used incorrect field path
**What was wrong:** Summary referenced `healthCheck.startupProbe` instead of `gateway.healthCheck.startupProbe`.
**What was changed:** Updated to the correct path `gateway.healthCheck.startupProbe` and `gateway.healthCheck.readinessProbe`.

## Review Notes
- The HTTP response code handling (200-399 healthy, 503 treated as healthy due to rate limiting, 500 healthy for readiness only) was verified as correct against Rook source code and issue discussions.
- The `exec`-based probe using `curl` is correctly described. The actual implementation uses `curl --insecure --silent --output /dev/stderr --write-out '%{response_code}' --max-time 3`.
- The probe timing parameters (`initialDelaySeconds`, `periodSeconds`, `timeoutSeconds`, `failureThreshold`, `successThreshold`) are all valid Kubernetes probe fields supported by the Rook CRD.
- The `kubectl` commands for testing the health endpoint, viewing events, and checking CRD status are all syntactically correct.
