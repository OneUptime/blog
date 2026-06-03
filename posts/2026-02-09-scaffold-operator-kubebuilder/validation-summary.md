# Validation Summary: How to Scaffold a Kubernetes Operator with Kubebuilder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubebuilder
- Kubernetes Operators
- Custom Resource Definitions
- controller-runtime
- Go
- Kustomize

## Sources Consulted
- Kubebuilder Quick Start: https://book.kubebuilder.io/quick-start.html
- Kubebuilder Getting Started guide: https://kubebuilder.io/getting-started
- Kubebuilder go/v4 plugin documentation: https://kubebuilder.io/plugins/available/go-v4-plugin.html
- Kubebuilder webhook implementation guide: https://book.kubebuilder.io/cronjob-tutorial/webhook-implementation
- Kubebuilder CRD validation marker reference: https://kubebuilder.io/reference/markers/crd-validation.html

## Issues Found
- The post said Kubebuilder generates CI configuration by default. Current Kubebuilder scaffolding generates project code, tests, manifests, and documentation, but not CI configuration by default, so that claim was removed.
- The generated controller path used the older `controllers/` layout. Current Kubebuilder Go scaffolding uses `internal/controller/`, so the path, package name, and project structure were updated.
- The controller RBAC markers included Service permissions even though the example does not create or manage Services. That unnecessary marker was removed.
- The manifest generation section only ran `make manifests`. After changing API types, the current Kubebuilder guide also calls for `make generate` to update DeepCopy code, so the command and explanation were corrected.
- The webhook example used older `webhook.Defaulter` and `webhook.Validator` receiver methods and was missing the `fmt` import. Current Kubebuilder webhook scaffolding uses `CustomDefaulter` and `CustomValidator` implementations registered with the manager, so the example was updated to the current `internal/webhook/v1` pattern.
- The local sample resource command used `kubectl apply -f config/samples/apps_v1_application.yaml`. Current Kubebuilder quick start applies samples through Kustomize with `kubectl apply -k config/samples/`, so the command was updated.

## Review Notes
The controller example is intentionally minimal. In production, status should usually reflect observed Deployment readiness and should avoid unnecessary status updates on every reconcile.
