# Validation Summary: How to Set crush_rule for Custom Data Placement

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH algorithm, OSD management, pool configuration)
- Rook (CephBlockPool CRD, rook-ceph-tools pod)
- Kubernetes (kubectl exec, kubectl cp)
- crushtool (CRUSH map compilation/decompilation)

## Sources Consulted
- Ceph CRUSH Map documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph source code (CrushWrapper.cc, PGMap.cc) for JSON output format verification
- kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Rook Quickstart guide: https://rook.io/docs/rook/latest/Getting-Started/quickstart/

## Issues Found

1. **Intro: Incorrect claim about CRUSH rule scope** — The third bullet stated CRUSH rules define "How many replicas to place." Replica count is controlled by the pool's `size` setting, not the CRUSH rule. Changed to "Which device class to target (e.g., `ssd`, `hdd`)" which accurately describes a key CRUSH rule capability.

2. **Step 1: Incorrect JSON output format for `ceph osd crush rule dump`** — The `type` field was shown as `"type": "replicated"` (string). In actual Ceph output, this is a numeric value: `"type": 1` for replicated rules. Also, the `take` step was missing the `"item": -1` field that always appears alongside `"item_name"` in real output. Fixed both.

3. **Step 4: Broken `kubectl cp` and missing `kubectl exec` wrapper** — The original commands used `kubectl cp rook-ceph/rook-ceph-tools:...` which requires an exact pod name, but Rook toolbox Deployments create pods with hash suffixes. The `kubectl cp` command does not accept `deploy/` syntax like `kubectl exec` does. Also, `ceph osd setcrushmap` was called without the `kubectl exec` wrapper, so it would fail in a Rook environment. Rewrote the entire extraction/editing/injection flow to: (a) run getcrushmap and crushtool inside the pod via `kubectl exec`, (b) resolve the actual pod name with `kubectl get pod -l app=rook-ceph-tools`, and (c) use that pod name for `kubectl cp` operations.

4. **Step 7: Fragile and incorrect `ceph pg dump` column reference** — The command used `awk '{print $1, $15}'` claiming `$15` is the acting OSD list. In current Ceph versions, column 15 is `REPORTED`, not `ACTING` (which is at column 18, and varies by version). Replaced with `ceph pg ls-by-pool <pool-name>` which is a targeted, version-stable command that shows PGs for a specific pool with their UP and ACTING sets.

## Review Notes
- The decompiled CRUSH map text format shown in Step 4 (rule definition with `id`, `type`, `min_size`, `max_size`, `step` directives) is correct and matches the crushtool decompiled format.
- The Rook CephBlockPool CRD fields (`deviceClass`, `crushRoot`, `replicasPerFailureDomain`, `targetSizeRatio`) are all valid and correctly placed in the YAML examples.
- The `ceph osd crush rule create-replicated` command syntax and parameter descriptions are accurate.
