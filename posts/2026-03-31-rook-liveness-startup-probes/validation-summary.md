# Validation Summary: How to Configure Liveness and Startup Probes in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (liveness probes, startup probes, pod health checks)
- CephCluster CRD (ceph.rook.io/v1)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook GitHub repository CRD spec: https://github.com/rook/rook/blob/master/Documentation/CRDs/Cluster/ceph-cluster-crd.md
- Kubernetes probe configuration docs: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes API reference for Probe spec: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#probe-v1-core
- Kubernetes container termination reasons and exit codes documentation

## Issues Found
1. **Incorrect claim about exit code 137 and OOM kills (line 113)**
   - **What was wrong:** The post stated "If the restart reason is `Error` with exit code `137`, the container was OOM-killed, not probe-killed." This is incorrect. Exit code 137 corresponds to SIGKILL, which is used by both the OOM killer and Kubernetes when terminating a container after a probe failure. When a container is OOM-killed, Kubernetes sets the termination reason to `OOMKilled`, not `Error`. A reason of `Error` with exit code 137 is more indicative of a probe-triggered kill or other external SIGKILL.
   - **What was changed:** Updated the text to correctly state that `OOMKilled` is the specific reason Kubernetes sets for out-of-memory terminations, and clarified that both OOM kills and probe kills produce exit code 137 — the distinction is in the reason field.
   - **Why:** The original statement could lead operators to misdiagnose probe-killed containers as OOM-killed, potentially causing them to increase memory limits when the real fix is adjusting probe thresholds.

## Review Notes
- The `successThreshold: 1` on the mon liveness probe is technically redundant since Kubernetes requires this value to be 1 for liveness probes (it's the default and only valid value). It's not wrong, but could be omitted for brevity.
- The CephCluster CRD paths (`spec.healthCheck.startupProbe` and `spec.healthCheck.livenessProbe`) with daemon keys (`mon`, `mgr`, `osd`) and the `disabled`/`probe` structure are all correct per Rook documentation.
- The explanation of Rook using the Ceph admin socket for probe checks is accurate.
- The kubectl commands and jsonpath expressions are syntactically correct and use the right label selectors for Rook OSD pods.
- The startup probe timeout calculation (periodSeconds * failureThreshold = 600s = 10 minutes) is correct.
