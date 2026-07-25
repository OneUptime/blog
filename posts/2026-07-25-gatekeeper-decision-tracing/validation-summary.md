# Validation Summary: How to Trace a Gatekeeper Decision and Debug Unexpected Rego Results

## Status
validated

## Post Type
Technical debugging guide

## Technologies Covered
- OPA Gatekeeper
- Open Policy Agent and Rego
- Kubernetes admission webhooks and `AdmissionReview`
- `kubectl`
- Gator policy testing

## Sources Consulted
- [Gatekeeper debugging and tracing](https://open-policy-agent.github.io/gatekeeper/website/docs/debug/)
- [Gatekeeper admission review input](https://open-policy-agent.github.io/gatekeeper/website/docs/input/)
- [Gatekeeper ConstraintTemplates and Rego v1 opt-in](https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/)
- [Gatekeeper Constraint matching](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/#the-match-field)
- [Gatekeeper replicated data](https://open-policy-agent.github.io/gatekeeper/website/docs/sync/)
- [Gatekeeper OPA version matrix](https://open-policy-agent.github.io/gatekeeper/website/docs/opa-versions/)
- [Gator CLI and verification suites](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/)
- [Gatekeeper source: trace selector implementation](https://github.com/open-policy-agent/gatekeeper/blob/master/pkg/webhook/common.go)
- [Gatekeeper source: constraint and template PodStatus APIs](https://github.com/open-policy-agent/gatekeeper/tree/master/apis/status/v1beta1)
- [OPA `object.get` built-in](https://www.openpolicyagent.org/docs/policy-reference/builtins/object)
- [OPA guidance for undefined values](https://www.openpolicyagent.org/docs/style-guide#use-negation-to-handle-undefined)
- [Kubernetes dynamic admission control and `AdmissionReview`](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes API dry-run behavior](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)
- [Kubernetes `kubectl apply` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found
- The `ConstraintTemplatePodStatus` and `ConstraintPodStatus` command used the default table output, which does not expose `status.observedGeneration` or `status.errors`. Added `-o yaml` so readers can inspect the fields named in the following instruction.
- The trace selected the `system:serviceaccount:ci:manifest-deployer` identity, but the dry-run command could be executed from an unrelated kubeconfig identity and therefore produce no trace. Clarified that the request must use the authentication context configured in the trace's `user` field.
- The troubleshooting text referred ambiguously to a GVK after API conversion. Changed it to the exact field Gatekeeper compares for trace selection: `AdmissionReview.request.kind`.
- The Rego checklist suggested that multiple `violation` rules could produce duplicate messages. Rego de-duplicates identical violations, so the checklist now distinguishes multiple distinct results from identical violations.
- The Gator guidance listed only some admission-only fields that require an `AdmissionReview` fixture. Added `uid` and `dryRun` to cover all admission-only fields identified earlier in the post.

## Review Notes
The post was checked against the current Gatekeeper v3.23.x documentation. The `config.gatekeeper.sh/v1alpha1` tracing configuration and `test.gatekeeper.sh/v1alpha1` Gator Suite API remain the documented interfaces. Gatekeeper 3.19 and later support Rego v1 only when it is explicitly selected in the ConstraintTemplate; the legacy Rego field continues to use Rego v0 syntax by default.
