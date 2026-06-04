# Validation Summary: How to Handle CRD Version Upgrades with Conversion Webhooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes conversion webhooks
- Kubernetes storage versions and storage migration
- kubectl
- Go HTTP webhook implementation
- TLS certificates with OpenSSL
- Prometheus metrics

## Sources Consulted
- Kubernetes documentation: Versions in CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes API reference: CustomResourceDefinition apiextensions.k8s.io/v1 - https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes documentation: Storage Versions - https://kubernetes.io/docs/concepts/overview/working-with-objects/storage-version/
- Kubernetes documentation: Migrate Kubernetes Objects Using Storage Version Migration - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/storage-version-migration/
- Kubernetes kubectl reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Go package documentation: io/ioutil deprecation - https://pkg.go.dev/io/ioutil
- Prometheus documentation: Instrumenting an HTTP server in Go - https://prometheus.io/docs/tutorials/instrumenting_http_server_in_go/

## Issues Found
- The post described conversion options as "automatic or manual conversion strategies." Kubernetes CRDs use `None` or `Webhook` conversion strategies, so the wording was corrected.
- The post implied conversion webhooks are always required to avoid manual migration. This was narrowed to schema-changing migrations, because the `None` strategy can be sufficient when only `apiVersion` changes.
- The initial CRD example marked `v1beta1` as the storage version before the later migration step. The example now keeps `v1alpha1` as storage until the migration section switches storage to `v1beta1`.
- The Go webhook used the deprecated `io/ioutil` package. It now uses `io.ReadAll`.
- The Go webhook determined every object's source version from `conversionReview.Request.Objects[0]`, which is incorrect because conversion requests can contain multiple objects that must be converted independently. It now reads the current loop object.
- The Go webhook used an unsafe `apiVersion` type assertion that could panic. It now validates that `apiVersion` is present and is a string.
- The Go webhook error response did not preserve the request `TypeMeta`, even though a conversion webhook must respond with the same `ConversionReview` version it received. The error response now copies the request `TypeMeta`.
- The Go webhook used string literals for Kubernetes status values. These were changed to `metav1.StatusSuccess` and `metav1.StatusFailure`.
- The testing script used `kubectl get application ... --v=v1alpha1` to request the old API version. `--v` is a verbosity flag, not an API version selector. The examples now use `applications.v1alpha1.example.com` and `applications.v1beta1.example.com`.
- The storage migration script reapplied resources before changing the CRD storage version, which would not rewrite objects into the new storage version. The script now patches the CRD storage version first, then fetches and reapplies objects through the new served version.

## Review Notes
The manual reapply migration example is technically valid for a small tutorial, but Kubernetes' Storage Version Migration API is the more robust production approach where available.
