# Validation Summary: How to Configure Fleet Drift Detection

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitOps
- `kubectl`
- Fleet CRDs (`GitRepo`, `BundleDeployment`)
- `fleet.yaml`

## Sources Consulted
- Fleet Custom Resources Spec: https://fleet.rancher.io/reference/ref-crds
- Fleet `fleet.yaml` Reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Status Fields Reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet Namespaces Reference: https://fleet.rancher.io/0.14/explanations/namespaces
- Fleet GitRepo API type: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet BundleDeployment API type: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/bundledeployment_types.go
- Fleet drift controller: https://github.com/rancher/fleet/blob/main/internal/cmd/agent/controller/drift_controller.go

## Issues Found
1. **Detection vs. correction were conflated**: The post implied Fleet always auto-reconciles drift. I changed the introduction and the section heading/content so the post now reflects that Fleet reports drift in status fields by default, and `correctDrift.enabled` enables automatic correction.
2. **Invalid `correctDrift` configuration**: The main `GitRepo` example incorrectly nested `keepResources` under `correctDrift`, and its `force` comment described ownership behavior that Fleet does not implement. I removed the invalid field and rewrote the comments to match Fleet’s actual `CorrectDrift` schema and semantics.
3. **Unverified and outdated version prerequisite**: The draft claimed `v0.6+` support without backing from the current official docs. I removed the minimum-version claim and kept the prerequisite generic.
4. **Testing commands used the wrong operational model**: The draft described a “typically 15 seconds” drift interval and omitted the need to run the mutation against a downstream cluster. I changed the commands to use a downstream cluster context and replaced the hardcoded interval claim with “wait a few seconds,” which matches Fleet’s event-driven drift reconciliation more accurately.
5. **BundleDeployment monitoring examples were incorrect**: The draft used `fleet-default` as the `BundleDeployment` namespace and later filtered on a nonexistent `.status.modified` field. I changed the commands to use `<cluster-namespace>` placeholders and real status fields such as `.status.display.state` and `.status.resourceCounts.modified`.
6. **GitRepo drift inspection used the wrong status surface**: The draft inspected `.status.conditions` as if there were drift-specific GitRepo conditions and relied on unsupported event reasons. I replaced those examples with `status.display.state` and `status.resourceCounts.modified`, which are the documented drift-related status summaries.
7. **Per-target `fleet.yaml` syntax was wrong**: The post used `targets:` in `fleet.yaml`, but Fleet uses `targetCustomizations:` for per-target bundle customizations. I corrected the key and kept the rest of the example aligned with the documented `correctDrift` usage.
8. **Shared-cluster and immutable-field guidance was inaccurate**: The shared-cluster example again misused `keepResources` and overstated what `force: false` protects against. I moved `keepResources` to the correct spec level, corrected the `force` explanation, and changed the immutable-field troubleshooting advice to inspect `BundleDeployment` status instead of unsupported event reasons.
9. **`modifiedStatus` inspection command was brittle**: The draft piped `jsonpath` output to `python3 -m json.tool`, which is not reliable for these object fields. I changed the command to use full JSON output and explicitly direct readers to `status.modifiedStatus`.

## Review Notes
- In multi-cluster Fleet deployments, `BundleDeployment` resources live in per-cluster namespaces such as `cluster-<workspace>-<cluster>-<random>`, not necessarily in the same namespace as the `GitRepo`.
- Fleet can still report drift when `correctDrift.enabled` is `false`; that setting disables remediation, not status reporting.
- `correctDrift.force: true` can recreate resources during rollback and should be reserved for cases where standard reconciliation cannot resolve the drift cleanly.
