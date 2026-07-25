# Validation Summary: Gatekeeper `deny`, `warn`, and `dryrun`: Choosing an Enforcement Action

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OPA Gatekeeper Constraint enforcement actions
- Kubernetes validating admission webhooks and admission warnings
- Gatekeeper audit and Constraint status
- Gator policy testing
- `kubectl` JSONPath, merge patch, and server-side dry run

## Sources Consulted
- Gatekeeper handling Constraint violations: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper audit: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper enforcement points: https://open-policy-agent.github.io/gatekeeper/website/docs/enforcement-points/
- Gatekeeper failing closed: https://open-policy-agent.github.io/gatekeeper/website/docs/failing-closed/
- Gatekeeper Gator CLI: https://open-policy-agent.github.io/gatekeeper/website/docs/gator/
- Gatekeeper basic `K8sRequiredLabels` ConstraintTemplate: https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/demo/basic/templates/k8srequiredlabels_template.yaml
- Gatekeeper Policy Library `K8sRequiredLabels` documentation: https://open-policy-agent.github.io/gatekeeper-library/website/validation/requiredlabels/
- Kubernetes dynamic admission control and warning responses: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes API dry-run behavior: https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
1. The JSONPath examples used `{"\\n"}` inside single-quoted shell arguments. That JSON string represents a literal backslash followed by `n`, so the commands would not emit the intended line breaks. Changed both literals to `{"\n"}`, matching the official `kubectl` JSONPath syntax.
2. The rollout sequence recommended testing disallowed objects with server-side dry run while the Constraint was still set to `dryrun`. In that mode Gatekeeper admits the request without a warning, so the command alone cannot reveal whether the candidate violates the policy. Removed server-side dry run from that step and clarified that it provides observable live admission feedback with `warn` or `deny`; for a Constraint in `dryrun`, Gator assertions or admission logs with `--log-denies` are needed.
3. `K8sRequiredLabels` is defined by an installed ConstraintTemplate rather than by Gatekeeper itself, and incompatible parameter schemas exist in official examples. The YAML uses the string-list schema from Gatekeeper's basic demo, while the current Gatekeeper Policy Library template uses objects with a `key` field. Added the exact ConstraintTemplate prerequisite so the example works as written.
4. Current Gatekeeper supports `enforcementAction: scoped` for assigning different actions to individual enforcement points. Narrowed the introductory claim to the common case where one action is applied across enforcement points, preserving the guide's intended focus on the three violation actions.
5. The audit column could be read as claiming that a request rejected by `deny` is itself recorded by audit. A denied request is not persisted; audit reports violating resources that exist in the cluster. Renamed the column to make that distinction explicit.
6. The illustrative `warn` output used wording that the identified basic `K8sRequiredLabels` template does not emit. Updated it to the template's actual default violation message so the output is consistent with the configured Constraint.

## Review Notes
- Gatekeeper documents `warn` as available in Gatekeeper v3.4 and later with Kubernetes v1.19 and later. The post does not target older releases, so its use of `warn` is current.
- `constraints.gatekeeper.sh/v1beta1`, `spec.enforcementAction`, the `Namespaced` match scope, `status.totalViolations`, the JSON merge patch command, and `kubectl apply --dry-run=server` are all current and correctly used after the fixes.
- Gatekeeper audit caps the individual entries stored in `.status.violations` (20 by default) while retaining the full count in `.status.totalViolations`, so the rollout guidance to track the total is accurate.
- Gatekeeper's documented default validation webhook configuration uses `failurePolicy: Ignore`, so the post correctly warns that `deny` alone does not make admission fail closed.
