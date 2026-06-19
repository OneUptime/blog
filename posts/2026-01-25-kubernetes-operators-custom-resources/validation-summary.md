# Validation Summary: How to Set Up Kubernetes Operators for Custom Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Operators
- CustomResourceDefinitions and custom resources
- Operator Lifecycle Manager
- OperatorHub Subscriptions
- Helm
- Zalando Postgres Operator
- OpsTree Redis Operator
- cert-manager
- Kubebuilder
- controller-runtime
- Kubernetes RBAC

## Sources Consulted
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Operator Lifecycle Manager install documentation: https://olm.operatorframework.io/docs/tasks/install-operator-with-olm/
- Operator Lifecycle Manager releases: https://github.com/operator-framework/operator-lifecycle-manager/releases
- Kubebuilder quick start: https://book.kubebuilder.io/quick-start.html
- controller-runtime controllerutil documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager releases: https://github.com/cert-manager/cert-manager/releases
- Zalando Postgres Operator user documentation: https://opensource.zalando.com/postgres-operator/docs/user.html
- Zalando Postgres Operator cluster manifest reference: https://opensource.zalando.com/postgres-operator/docs/reference/cluster_manifest.html
- OpsTree Redis Operator repository and documentation pointer: https://github.com/ot-container-kit/redis-operator

## Issues Found
- The OLM install command pinned `v0.27.0`, which is outdated. Updated it to `v0.45.0`, the current release found in the official OLM release metadata.
- The cert-manager YAML install command pinned `v1.13.0`, which is no longer a current supported release. Updated it to `v1.20.2`, the current stable release listed by cert-manager release metadata on the review date.
- The cert-manager HTTP-01 example used `spec.acme.solvers[].http01.ingress.class: nginx`. cert-manager recommends `ingressClassName` for most ingress controllers, including nginx, and reserves `class` mainly for ingress-gce compatibility. Updated the example to `ingressClassName: nginx`.
- The Kubebuilder install command moved the binary to `/usr/local/bin/` without elevated permissions. Updated it to match the official Kubebuilder quick start by using `sudo mv`.
- The controller example used the same `appsv1` package alias for both the custom `MyApp` type and the Kubernetes `Deployment` type, which would not compile as shown. Updated the custom type reference to `myappv1.MyApp`.
- The controller example declared an unused logger, which would fail Go compilation. Removed the unused variable.
- The controller example ignored the error from setting the owner reference. Updated it to return that error.
- The controller example attempted `Create`, then `Update` on an object that had not been read from the API server when the Deployment already existed. That update would lack a resource version and fail. Replaced the create/update logic with `controllerutil.CreateOrUpdate`.

## Review Notes
The remaining examples are representative and depend on operator-specific CRDs, installed catalogs, namespaces, storage classes, and available operator channels in the target cluster. Local `kubectl` and `helm` binaries were not available in the review environment, so command validation used official documentation and release metadata rather than local `--help` output.
