# Validation Summary: How to Write Kyverno Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kyverno (Kubernetes-native policy engine)
- Kubernetes (ClusterPolicy, Policy, NetworkPolicy, ResourceQuota, Secret, PolicyReport)
- Helm (Kyverno installation)
- Kyverno CLI (`kyverno apply`, `kyverno test`)
- JMESPath (used inside Kyverno conditions and variables)
- YAML / JSON Patch (RFC 6902) for `patchesJson6902`

## Sources Consulted
- Kyverno Helm chart values (https://github.com/kyverno/kyverno/tree/main/charts/kyverno) — confirmed the v3 chart has no top-level `replicaCount`; replicas are configured per controller (`admissionController.replicas`, `backgroundController.replicas`, `cleanupController.replicas`, `reportsController.replicas`).
- Kyverno preconditions / deny condition semantics (release-1-11-0.kyverno.io/docs/writing-policies/preconditions/) — confirmed `any` is logical OR, `all` is logical AND; deny triggers when conditions evaluate true.
- Kyverno JMESPath / operators reference — confirmed valid deny-condition operators are `Equals`, `NotEquals`, `In`, `NotIn`, `AnyIn`, `AnyNotIn`, `AllIn`, `AllNotIn`, and the numeric/duration comparators. There is no `Match`/`NotMatch`/`Regex`/`NotRegex` operator; regex evaluation is done with the `regex_match()` JMESPath function.
- Kyverno policy reference for validate (pattern anchors `?*`, `!*`, `+(...)`, `(...)`, `=(...)`), mutate (`patchStrategicMerge`, `patchesJson6902`), generate (clone/data, `synchronize`), and PolicyException (kyverno.io/v2beta1) syntax.
- Kyverno CLI release assets at https://github.com/kyverno/kyverno/releases — confirmed `kyverno-cli_v1.11.0_linux_x86_64.tar.gz` filename pattern.

## Issues Found

1. **Helm install used an invalid `replicaCount` flag.** The post ran `helm install kyverno kyverno/kyverno ... --set replicaCount=3 --set admissionController.replicas=3`. Kyverno's chart (v3.x) removed the top-level `replicaCount` key when it split deployments into per-controller blocks, so `--set replicaCount=3` is a silent no-op and misleading to readers. **Fix:** dropped `replicaCount=3` and added `backgroundController.replicas=2` so the HA example demonstrates the per-controller pattern correctly.

2. **JMESPath `deny` example had inverted logic AND used a non-existent operator.** The original example was:
   ```yaml
   deny:
     conditions:
       any:
         - key: "{{request.object.metadata.annotations.owner || ''}}"
           operator: NotEquals
           value: ""
         - key: "{{request.object.metadata.annotations.owner}}"
           operator: NotMatch
           value: "<email regex>"
   ```
   Two problems: (a) with `any` + `NotEquals ""`, a valid owner annotation like `"jane@example.com"` evaluates as `!= ""` → true → deny fires, which is the opposite of the intended "Owner annotation must match a valid email format". (b) `NotMatch` is not a valid Kyverno condition operator. **Fix:** swapped the first condition to `Equals ""` (deny when missing/empty) and rewrote the second condition using the `regex_match()` JMESPath function compared with `Equals false` (deny when the value does not match the email regex).

## Review Notes
- The post uses `kyverno.io/v2beta1` for `PolicyException`. This is still accepted in current Kyverno but `kyverno.io/v2` is now GA in Kyverno 1.12+. The post explicitly scopes its example to "Kyverno 1.9+", so the v2beta1 example remains correct for that range. Readers on 1.12+ should prefer `v2`.
- Kyverno CLI download example pins v1.11.0, which is older than the current GA. The download URL pattern is still valid and the example continues to work; readers may want a newer release for new clusters.
- The `validationFailureAction` field is declared at the spec level (e.g., `spec.validationFailureAction: Enforce`). Kyverno 1.10+ also supports declaring this per-rule under `spec.rules[].validate.failureAction`. The spec-level form used here is fully supported and not deprecated, so no change needed.
- All anchor syntax (`?*`, `!*`, `=(...)`, `+(...)`, `(...)`) and the `patchStrategicMerge` / `patchesJson6902` examples are syntactically and semantically correct.
- The `generate` rule examples (NetworkPolicy, ResourceQuota, cloning Secrets via `clone:` + `synchronize: true`) match current API shape.
- The wildcard image-pattern syntax `"gcr.io/my-project/* | docker.io/mycompany/* | ghcr.io/myorg/*"` correctly uses `|` as the Kyverno pattern OR operator.
- The `kyverno-test.yaml` test-manifest schema (`name`, `policies`, `resources`, `results[]`) is correct for the Kyverno CLI test command.
