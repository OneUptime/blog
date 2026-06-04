# Validation Summary: How to Write Integration Tests for Kubernetes Controllers with envtest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes controllers
- controller-runtime envtest
- Kubebuilder
- Go
- Ginkgo
- Gomega
- Kubernetes API server, etcd, CRDs, owner references, status subresources, finalizers, and admission validation

## Sources Consulted
- controller-runtime envtest package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/envtest
- controller-runtime setup-envtest tool documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/tools/setup-envtest
- Kubebuilder Book, Writing tests: https://book.kubebuilder.io/cronjob-tutorial/writing-tests
- Kubebuilder Book, Configuring envtest: https://book.kubebuilder.io/reference/envtest
- Gomega asynchronous assertions documentation: https://onsi.github.io/gomega/
- Ginkgo command-line filtering documentation: https://onsi.github.io/ginkgo/

## Issues Found
- The post implied envtest downloads the API server and etcd binaries itself. Updated the wording to say envtest starts the binaries, while setup-envtest downloads/manages them.
- The setup-envtest install command used `@latest`. Updated it to use a controller-runtime release branch and added guidance to choose the release branch that matches the project version.
- The suite test snippet imported `time` without using it. Removed the unused import.
- The controller test snippet used `context.Background()` and `errors.IsNotFound()` without importing the required packages. Added `context` and `k8s.io/apimachinery/pkg/api/errors` as `apierrors`.
- The controller tests reused a fixed namespace across examples. Updated the example to create a generated namespace for each test, matching envtest namespace limitations.
- The deletion test expected Kubernetes garbage collection to remove a Deployment. envtest does not run built-in controllers such as the garbage collector, so the test now verifies the owner reference and only asserts deletion of the Application itself.
- The status test did not mention that envtest lacks kubelet and built-in controllers. Added a caveat so readers only assert status values their controller can compute in the envtest environment.
- The invalid-input example assumed a validation webhook was always installed. Updated the comment to clarify that the create call fails only when CRD schema validation or configured webhooks reject the input.
- The post claimed envtest integration tests catch incorrect RBAC. The default envtest setup is not a reliable RBAC validation path, so this was changed to invalid CRD schemas.

## Review Notes
The examples remain illustrative because the custom `Application` type and reconciler are placeholders. A production project should also include webhook installation options when testing admission webhooks and should avoid depending on Kubernetes components that envtest does not start.
