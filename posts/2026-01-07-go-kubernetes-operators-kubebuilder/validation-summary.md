# Validation Summary: How to Build Kubernetes Operators in Go with Kubebuilder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Kubernetes
- Kubebuilder
- Custom Resource Definitions
- controller-runtime
- envtest
- Ginkgo/Gomega
- Prometheus metrics

## Sources Consulted
- Kubebuilder Book, Quick Start: https://book.kubebuilder.io/quick-start.html
- Kubebuilder Book, Getting Started: https://book.kubebuilder.io/getting-started.html
- Kubebuilder Book, CRD validation markers: https://book.kubebuilder.io/reference/markers/crd-validation.html
- Kubebuilder Book, Project Config: https://book.kubebuilder.io/reference/project-config.html
- Kubebuilder Book, go/v3 to go/v4 migration layout: https://book-v3.book.kubebuilder.io/migration/manually_migration_guide_gov3_to_gov4
- Kubebuilder Book, Metrics: https://book.kubebuilder.io/reference/metrics.html
- controller-runtime metrics package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/metrics
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes resource.Quantity documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/api/resource
- Ginkgo documentation: https://onsi.github.io/ginkgo/

## Issues Found
- The introduction described Kubebuilder as the "official SDK for building operators." Updated this to describe Kubebuilder as a framework for building Kubernetes APIs and controllers, matching the Kubebuilder project documentation.
- The prerequisites listed Go 1.21 and Kubebuilder v3.x or later while the installation command downloads the current latest Kubebuilder. Updated the requirements to Go 1.24.6 or later and Kubebuilder v4.x or later to match the current Kubebuilder quick-start documentation.
- The scaffolded project tree showed `main.go` at the repository root. Updated it to `cmd/main.go`, which matches the current go/v4 Kubebuilder layout.
- The deployment reconciliation code ignored resource requests when only `cpuRequest` or `memoryRequest` was set. Updated the condition so requests-only configurations are applied.
- The deployment update helper only compared replicas and image, so changes to port, environment variables, resource requirements, or probes would not be reconciled. Updated it to compare the operator-owned parts of the pod template without comparing API-server-defaulted fields that would cause unnecessary updates.
- The service reconciliation code assumed `existing.Spec.Ports[0]` always existed. Updated it to handle an empty ports list and refresh the service ports and selector safely.
- The suspend handler dereferenced `deployment.Spec.Replicas` without a nil check and ignored status update errors. Updated it to handle nil replicas and return status update errors.
- The testing section called envtest-based tests "unit testing." Renamed the heading to "Integration Testing the Controller."
- The Ginkgo examples depended on state created by earlier specs. Updated the update, suspend, and delete tests to create their own WebApp resources with distinct names, keeping specs independent as Ginkgo expects.

## Review Notes
- The snippets are tutorial-oriented and omit some production hardening, such as conflict retries around status updates and broader validation for Kubernetes quantity strings. The examples are technically valid after the fixes, but a production operator should usually add retry-on-conflict handling, more complete input validation, and focused tests for update paths.
