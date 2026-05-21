# Validation Summary: How to Manage Istio Configuration with Pulumi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Pulumi
- Pulumi Kubernetes provider
- Kubernetes Custom Resources
- Helm
- TypeScript

## Sources Consulted
- Pulumi Kubernetes Helm Release API: https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/release/
- Pulumi Kubernetes CustomResource API: https://www.pulumi.com/registry/packages/kubernetes/api-docs/apiextensions/customresource/
- Pulumi Config API for Node.js/TypeScript: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/classes/Config.html
- Pulumi unit testing guide: https://www.pulumi.com/docs/iac/guides/testing/unit/
- Pulumi stack export/import CLI docs: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_export/ and https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_import/
- Istio Helm install docs: https://istio.io/latest/docs/setup/install/helm/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.22 EOL notice: https://istio.io/latest/news/support/announcing-1.22-eol-final/
- Istio release-1.29 Helm chart values and templates: https://github.com/istio/istio/tree/release-1.29/manifests/charts
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy API reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/

## Issues Found
- Istio version `1.22.0` is no longer supported; Istio's support table and EOL notice show 1.22 ended support in January 2025. Updated the examples and Pulumi config default to `1.29.2`, which is in the currently supported 1.29 release line.
- The `istiod` Helm values used the older `pilot` nesting. Current Istio 1.29 chart values expose these settings at the chart root, so the example now sets `autoscaleEnabled`, `autoscaleMin`, `autoscaleMax`, and `resources` directly under `values`.
- The reusable component was imported in the testing example but declared as a non-exported class. Updated it to `export class IstioService`.
- The unit test attempted to read `svc.virtualService.spec.apply(...)`, but Pulumi Kubernetes `CustomResource` only exposes typed outputs for common fields such as `apiVersion`, `kind`, and `metadata`; arbitrary CRD fields are available through the resource inputs. Updated the test to read `svc.virtualService.getInputs().spec`.
- The post described `pulumi stack export --version ... | pulumi stack import` as a rollback. Pulumi documents these commands as exporting and importing stack deployment state, so the wording now says it restores a previous stack checkpoint for state repair.

## Review Notes
The Istio Gateway, VirtualService, DestinationRule, AuthorizationPolicy, MeshConfig, Helm Release, Pulumi Config, and Pulumi CLI command shapes were otherwise consistent with the official documentation reviewed. The pinned Istio version should be revisited periodically because Istio support windows move quickly.
