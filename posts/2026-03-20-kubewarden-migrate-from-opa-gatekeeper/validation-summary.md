# Validation Summary: How to Migrate from OPA Gatekeeper to Kubewarden - Gatekeeper

## Status
validated

## Post Type
Guide / Migration tutorial

## Technologies Covered
- Kubernetes admission control
- OPA Gatekeeper
- Kubewarden
- Rego
- WebAssembly policy distribution
- `kubectl`
- Helm

## Sources Consulted
- Gatekeeper usage documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto
- Gatekeeper constraint violations and `enforcementAction` documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations
- Gatekeeper policy library, privileged containers: https://open-policy-agent.github.io/gatekeeper-library/website/validation/privileged-containers/
- Gatekeeper policy library, allowed repositories: https://open-policy-agent.github.io/gatekeeper-library/website/validation/allowedrepos/
- Kubewarden monitor mode documentation: https://docs.kubewarden.io/reference/monitor-mode
- Kubewarden Gatekeeper migration guide: https://docs.kubewarden.io/howtos/gatekeeper-migration
- Kubewarden Rego / Gatekeeper support documentation: https://docs.kubewarden.io/tutorials/writing-policies/rego/intro-rego
- Kubewarden audit scanner reports documentation: https://docs.kubewarden.io/explanations/audit-scanner/policy-reports
- Kubewarden `pod-privileged` policy README: https://github.com/kubewarden/pod-privileged-policy
- Kubewarden `trusted-repos-policy` README: https://github.com/kubewarden/trusted-repos-policy
- Kubewarden `safe-labels` policy README: https://github.com/kubewarden/safe-labels-policy
- Kubewarden Gatekeeper policy template README: https://github.com/kubewarden/gatekeeper-policy-template

## Issues Found
1. The comparison table overstated or mislabeled several implementation details. Gatekeeper policies are not stored as ConfigMaps, Gatekeeper testing is typically done with `gator`/OPA tooling rather than only the OPA CLI, and the mutation/context/performance rows were phrased too loosely. Updated the table to reflect the documented CRD formats and execution models.
2. The inventory/export commands used `kubectl get constraints -A` and a template-name loop. Gatekeeper documents `kubectl get constraints` directly, and constraints are cluster-scoped. Replaced the listing/export commands with the documented generic `constraints` resource and removed the unnecessary namespace-wide loop.
3. The “Allowed Registries” example mixed Gatekeeper’s `K8sAllowedRepos` semantics with a non-canonical Kubewarden module and settings key. The original Kubewarden example used `allowed-image-repositories` with `allowedRegistries`, which does not match the official `trusted-repos-policy` documentation. Replaced it with `trusted-repos-policy` using `images.allow`, and added trailing `/` suffixes to the Gatekeeper prefixes to match Gatekeeper library guidance about avoiding repository-prefix bypasses.
4. The required-labels Kubewarden example pointed at the wrong module. The official Kubewarden policy for mandatory labels is `safe-labels`, with `mandatory_labels` settings. Replaced `k8s-objects` with `safe-labels`.
5. The side-by-side migration section implied Kubewarden monitor-mode violations appear as Kubernetes Events with `reason=PolicyViolation`. Kubewarden’s monitor mode is documented in terms of traces and metrics, while Kubewarden’s cluster-wide audit results are exposed through `Report` and `ClusterReport` resources when the audit scanner is enabled. Replaced the event-based commands with Gatekeeper constraint status inspection plus Kubewarden audit report queries.
6. The transition script used `kubectl annotate constraint ... gatekeeper.sh/disable=true`, which is not a documented way to disable Gatekeeper constraints. Gatekeeper documents `enforcementAction: dryrun` and `warn` as the supported non-blocking modes. Replaced the annotation flow with a patch that moves the specific constraint resource into `dryrun`.
7. The cleanup step used `kubectl delete constraints -A --all`. Constraints are cluster-scoped, so the namespace-wide flag was removed.
8. The custom-policy migration guidance incorrectly said custom Gatekeeper Rego policies must be rewritten in Rust, Go, or AssemblyScript. Kubewarden officially supports Gatekeeper-style Rego policies and provides a dedicated `gatekeeper-policy-template`. Replaced the rewrite guidance with the documented Rego-porting flow using the Gatekeeper template and `OPA_V0_COMPATIBLE=true make` for older Gatekeeper Rego syntax.
9. The validation step filtered events by `reason=PolicyViolation` and sorted by `.lastTimestamp`, which is not a reliable current Kubernetes/Kubewarden validation pattern. Replaced it with a generic recent-events query sorted by `.metadata.creationTimestamp`.
10. The conclusion repeated the inaccurate claim that custom Rego policies require a rewrite. Updated it to reflect Kubewarden’s documented Gatekeeper/Rego migration path.

## Review Notes
- The post is now technically sound as a high-level migration guide, but several examples intentionally use `:latest` for Kubewarden policy modules to avoid hard-coding stale tags after the original post referenced outdated or incorrect module names/versions. For production use, pinning a tested tag or digest would be safer.
- The official Kubewarden policy repositories consulted here note that development moved into the `kubewarden/policies` monorepo starting with Kubewarden 1.32.0. The blog examples still use the documented GHCR module references, which remain the relevant deployment interface for readers.
- Gatekeeper mutation resources are a separate migration path from Gatekeeper validation policies. The post now reflects that existing Gatekeeper validation Rego can usually be ported directly, while mutators need to be reimplemented as Kubewarden mutating policies.
- Local checks: `validation.json` was validated with `jq`. No live Kubernetes cluster or Helm release was available in this workspace, so runtime validation of the manifests and commands against a real cluster was not performed.
