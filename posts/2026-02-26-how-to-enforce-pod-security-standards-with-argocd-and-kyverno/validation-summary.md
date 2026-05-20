# Validation Summary: How to Enforce Pod Security Standards with ArgoCD and Kyverno

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Pod Security Standards
- Kyverno policy APIs
- Argo CD Applications and ApplicationSets
- Helm chart configuration
- Kustomize
- PrometheusRule monitoring
- kubectl, argocd CLI, and yq commands

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kyverno ValidatingPolicy documentation: https://kyverno.io/docs/policy-types/validating-policy/
- Kyverno MutatingPolicy documentation: https://kyverno.io/docs/policy-types/mutating-policy/
- Kyverno ClusterPolicy validation documentation and deprecation notes: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy settings and deprecated fields: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings
- Kyverno installation customization and webhook configuration: https://kyverno.io/docs/installation/customization/
- Kyverno official Pod Security policy samples: https://kyverno.io/policies/pod-security/
- Kyverno metrics reference: https://kyverno.io/docs/reference/metrics/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD ApplicationSet cluster generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Kyverno Helm chart repository index and chart values: https://kyverno.github.io/kyverno/index.yaml

## Issues Found
- The Kyverno Helm chart version and values were outdated or misplaced. Updated the chart from `3.1.4` to `3.8.1`, moved replica and resource settings under `admissionController`, and corrected `config.webhooks` to the current object form.
- The validation examples used deprecated `ClusterPolicy` fields such as `spec.validationFailureAction`. Replaced the examples with current `policies.kyverno.io/v1` `ValidatingPolicy` resources using `validationActions`, `matchConstraints`, and CEL validations.
- Several Pod Security policy examples did not cover init containers and ephemeral containers correctly. Updated CEL expressions to evaluate `containers`, `initContainers`, and `ephemeralContainers`.
- The run-as-non-root policy incorrectly mixed non-root enforcement with `allowPrivilegeEscalation`. Replaced it with a correct `runAsNonRoot` validation matching the Restricted control.
- The read-only root filesystem policy was presented as a Restricted Pod Security Standard control. Clarified that it is an additional hardening policy and changed its category to Best Practices.
- The capabilities policy only checked regular containers and used fragile JMESPath logic. Replaced it with a current CEL policy that requires dropping `ALL` capabilities and only permits `NET_BIND_SERVICE`.
- The mutating policy used deprecated `ClusterPolicy` mutate syntax. Updated it to a current `MutatingPolicy` using `ApplyConfiguration`.
- The Argo CD violation wording implied the Application would necessarily be `Degraded`. Corrected it to say the sync operation fails and Argo CD surfaces the admission webhook violation in operation details.
- The Prometheus metric `kyverno_policy_results_total` is outdated in current Kyverno docs. Updated the alert expression to use `kyverno_policy_results`.

## Review Notes
The post is now accurate for current Kyverno documentation and chart values as of 2026-05-20. The `kubectl`, `argocd app get --show-operation`, Kustomize, Argo CD Application, and ApplicationSet examples are syntactically plausible. The local environment did not have `kubectl`, `helm`, or `argocd` installed, so CLI behavior was verified against official documentation and chart contents rather than local command help.
