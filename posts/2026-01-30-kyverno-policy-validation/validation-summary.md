# Validation Summary: How to Create Kyverno Policy Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kyverno ClusterPolicy validation rules
- Kubernetes admission control
- Kubernetes Deployments and Pods
- Kubernetes securityContext settings
- Kyverno CLI
- Kubernetes PolicyReport and ClusterPolicyReport resources

## Sources Consulted
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno failure action overrides documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/#failure-action-overrides
- Kyverno JMESPath documentation: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Kyverno CLI apply reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Kyverno CLI installation documentation: https://kyverno.io/docs/subprojects/kyverno-cli/
- Kyverno policy reports documentation: https://kyverno.io/docs/guides/reports/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The examples used the deprecated top-level `spec.validationFailureAction` and `spec.validationFailureActionOverrides` fields. Updated the policies to use per-rule `validate.failureAction` and `validate.failureActionOverrides`, which Kyverno documents as the current form.
- The first test command said `kubectl create deployment nginx --image=nginx` would be rejected, but generated Deployments include an `app` label. Replaced the failing example with an explicit Deployment manifest missing `metadata.labels.app`, while keeping the generated Deployment as the passing example.
- The pattern matching example used `securityContext.runAsRoot`, which is not a Kubernetes container securityContext field. Replaced it with `securityContext.allowPrivilegeEscalation: "!true"` to demonstrate Kyverno negation against a valid Kubernetes field.
- The precondition referenced a label key containing a dash as `metadata.labels.deployment-type`, which is unsafe in Kyverno JMESPath. Updated it to `metadata.labels.\"deployment-type\"`.
- The readiness probe example attempted to express alternative object keys with `(httpGet | tcpSocket | exec)`, which is not the documented way to express alternate patterns. Replaced it with `anyPattern` entries for `httpGet`, `tcpSocket`, and `exec`.
- The numeric comparison comment said `>=1` while the policy values were `>=100m` and `>=128Mi`. Updated the comment to match the shown values.

## Review Notes
The corrected examples use the current Kyverno validate rule shape and all YAML snippets parse successfully. The security-context examples intentionally require container-level settings; in production, teams may also want to account for equivalent pod-level settings with `anyPattern`.
