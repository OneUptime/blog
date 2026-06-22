# Validation Summary: Managing Cloud Infrastructure with Helm and Crossplane

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Crossplane
- Helm
- Kubernetes
- Upbound AWS, GCP, and Azure providers
- Crossplane managed resources, composite resources, claims, and compositions
- Prometheus Operator monitoring resources

## Sources Consulted
- Crossplane v1.20 install documentation: https://docs.crossplane.io/v1.20/software/install/
- Crossplane v1.20 providers documentation: https://docs.crossplane.io/v1.20/concepts/providers/
- Crossplane v2.3 providers documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane v2.3 function patch and transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane v2.3 metrics documentation: https://docs.crossplane.io/latest/guides/metrics/
- Crossplane v1.20 Helm chart values: https://github.com/crossplane/crossplane/blob/v1.20.0/cluster/charts/crossplane/values.yaml
- Crossplane v1.20 Composition CRD schema: https://github.com/crossplane/crossplane/blob/v1.20.0/cluster/crds/apiextensions.crossplane.io_compositions.yaml
- Crossplane v1.20 DeploymentRuntimeConfig CRD schema: https://github.com/crossplane/crossplane/blob/v1.20.0/cluster/crds/pkg.crossplane.io_deploymentruntimeconfigs.yaml
- Upbound provider authentication documentation: https://docs.upbound.io/manuals/packages/providers/authentication/
- Upbound provider family documentation: https://docs.upbound.io/manuals/packages/providers/provider-families/
- Upbound AWS provider v0.47.0 CRD schemas: https://github.com/upbound/provider-aws/tree/v0.47.0/package/crds
- Prometheus Operator PodMonitor API documentation: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The Helm install example created the namespace separately and omitted Helm's documented `--create-namespace` option. Updated the install command to create the namespace during `helm install`.
- The Crossplane Helm values used invalid chart keys: `resources`, `securityContext`, and `podDisruptionBudget`. Replaced them with documented chart values such as `resourcesCrossplane` and `securityContextCrossplane`, and removed the unsupported pod disruption budget block.
- The production flags included stale or unnecessary Crossplane flags. Removed `--enable-external-secret-stores` and `--enable-composition-revisions`, and kept current composition-related flags.
- The AWS provider runtime configuration used deprecated `ControllerConfig` and `controllerConfigRef`. Replaced them with `DeploymentRuntimeConfig` and `runtimeConfigRef`, including the documented `package-runtime` container name and empty selector required for Deployment schema validation.
- The Composition used deprecated native resources-mode patch and transform fields. Updated it to `mode: Pipeline` with `function-patch-and-transform`, preserving the original resource templates and patches under the function input.
- The composed RDS resource had `writeConnectionSecretToRef.namespace` but no required `name`. Added a connection secret name so the managed resource passes schema validation.
- The monitoring example used a `ServiceMonitor` for a metrics service/port not created by the Crossplane Helm chart. Replaced it with a `PodMonitor` targeting provider pods, matching the provider metric used in the alert example.
- The troubleshooting section included `kubectl get crossplane`, which is not a valid Crossplane status command. Replaced it with `kubectl get deployments -n crossplane-system` and added the namespace to the claim describe command.

## Review Notes
- The provider package versions in the post are older but still version-specific examples. A future update could migrate the article to current provider-family packages and Crossplane v2 namespace-scoped managed resource examples.
- The static cloud resource placeholders such as `vpc-xxxxx`, `subnet-xxxxx`, and credential placeholders still need real environment-specific values before applying the manifests.
