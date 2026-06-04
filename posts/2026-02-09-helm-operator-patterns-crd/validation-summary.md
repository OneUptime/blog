# Validation Summary: How to Build Helm Operator Patterns That Watch for Chart CRD Changes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Helm Go SDK
- Kubernetes CustomResourceDefinitions
- Kubernetes operators
- controller-runtime
- Go
- Prometheus metrics

## Sources Consulted
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes custom resources documentation: https://kubernetes.io/docs/concepts/api-extension/custom-resources/
- Helm Go SDK documentation: https://helm.sh/docs/sdk/
- Helm v3 action package API reference: https://pkg.go.dev/helm.sh/helm/v3/pkg/action
- controller-runtime builder package API reference: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/builder
- controller-runtime client package API reference: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client
- Bitnami Helm repository index: https://charts.bitnami.com/bitnami/index.yaml

## Issues Found
- The CRD defined a `status` schema but did not enable the `status` subresource. Since the controller uses `r.Status().Update(ctx, hr)`, I added `subresources: status: {}` under the CRD version.
- The controller accepted `spec.repo` but did not pass it to Helm chart resolution. I added `client.ChartPathOptions.RepoURL = hr.Spec.Repo` for both install and upgrade paths.
- The install and upgrade helpers accepted a context but used Helm's non-context `Run` methods. I changed them to `RunWithContext` so the reconciler context is respected.
- The status update helper ignored `r.Status().Update` errors. I changed it to return an error and made the successful reconciliation path handle it.
- The advanced `dependsOn` example used a field not present in the CRD schema. I added a matching `dependsOn` array schema so the example field is part of the declared custom resource.
- The example Bitnami nginx chart version was `15.0.0`, which was not present in the current Bitnami repository index checked during validation. I updated it to `25.0.0`, which is listed in the referenced repository.

## Review Notes
The examples remain tutorial-level snippets. A production Helm operator would still need stronger dependency reconciliation, finalizers for uninstall behavior, condition updates with transition times, RBAC examples, and more precise release existence handling for failed or pending Helm releases.
