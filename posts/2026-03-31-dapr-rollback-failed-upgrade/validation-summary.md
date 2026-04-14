# Validation Summary: How to Roll Back a Failed Dapr Upgrade

## Status
validated

## Post Type
Tutorial / Incident Response Guide

## Technologies Covered
- Dapr (sidecar architecture, control plane, annotations)
- Kubernetes (deployments, rollouts, JSON patch)
- Helm (release history, rollback)
- Bash scripting

## Sources Consulted
- Helm CLI reference: `helm history --help`, `helm rollback --help` — confirmed `--output`, `--wait`, `--timeout` flags and JSON output structure with `.status` and `.revision` fields
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/ — confirmed `dapr.io/sidecar-image` annotation
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/ — confirmed `GET /v1.0/healthz` endpoint on port 3500
- Docker Hub `daprio/daprd` — confirmed tag `1.13.0` exists
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/ — confirmed `rollout undo`, `rollout restart`, `exec deployment/NAME` syntax
- RFC 6902 (JSON Patch): https://datatracker.ietf.org/doc/html/rfc6902 — confirmed `"op": "add"` creates or replaces members
- RFC 6901 (JSON Pointer): confirmed `~1` encoding for `/` in annotation path `dapr.io/sidecar-image`

## Issues Found

### 1. Sidecar rollback script targeted all deployments, not just Dapr-enabled ones
**What was wrong:** The script used `kubectl get deployments -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}'` which returns every deployment in the namespace. The comment said "Force rollout undo for all dapr-enabled deployments" but there was no filtering.
**What was changed:** Replaced the jsonpath query with a `jq` filter that selects only deployments where the pod template annotation `dapr.io/enabled` is `"true"`.
**Why:** Running `kubectl rollout undo` on non-Dapr deployments could revert unrelated application changes, causing unexpected outages during an already stressful incident.

### 2. Unused `PREVIOUS_IMAGE` variable with incorrect `--revision=1`
**What was wrong:** The script computed `PREVIOUS_IMAGE` using `kubectl rollout history --revision=1`, which always inspects the first-ever revision (not the previous one). Additionally, the variable was never used anywhere in the script.
**What was changed:** Removed the dead code (`PREVIOUS_IMAGE` assignment) to avoid misleading readers into thinking `--revision=1` retrieves the previous revision.
**Why:** Dead code that uses incorrect logic could mislead readers who adapt the script for their own use.

### 3. Missing `dapr-sidecar-injector` in control plane health checks
**What was wrong:** The control plane rollback verification only checked `dapr-operator` and `dapr-sentry`, missing `dapr-sidecar-injector` which is responsible for injecting sidecars into new pods.
**What was changed:** Added `kubectl rollout status deployment/dapr-sidecar-injector -n dapr-system --timeout=5m` to the verification step.
**Why:** The sidecar injector is a critical control plane component. If it's not healthy after rollback, new pods won't get the Dapr sidecar injected, breaking service mesh functionality.

## Review Notes
- The control plane checks still omit `dapr-placement` (a StatefulSet for actor support) and `dapr-scheduler` (added in Dapr 1.12+). These are less universally critical — placement is only needed for actors, and scheduler may not be present in older installations — so omitting them is acceptable for a general-purpose guide.
- The verification script checks only `items[0]` for the control plane version, which only validates one pod's image. A more thorough check would iterate all pods, but this is adequate for a quick verification.
- The `helm history` jq logic correctly identifies the rollback target: after a failed Helm upgrade, the previously deployed revision retains `"deployed"` status while the failed one gets `"failed"` status.
