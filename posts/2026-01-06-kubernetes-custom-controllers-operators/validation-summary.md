# Validation Summary: How to Implement Custom Controllers and Operators in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide — a hands-on walkthrough of building a Kubernetes operator with Kubebuilder, covering CRD design, the reconciliation loop, testing, deployment, and advanced patterns (webhooks, leader election, metrics).

## Technologies Covered
- Kubernetes (Custom Resources, CRDs, controllers, operators)
- Kubebuilder (project scaffolding, `make` targets, helm plugin)
- Go
- controller-runtime (`sigs.k8s.io/controller-runtime`)
- Kubernetes Go client types (`k8s.io/api`, `k8s.io/apimachinery`)
- Ginkgo / Gomega (testing)
- Prometheus client + Prometheus Operator `ServiceMonitor`
- Helm

## Sources Consulted
- Kubebuilder Book — Webhook implementation (CustomDefaulter / CustomValidator): https://book.kubebuilder.io/cronjob-tutorial/webhook-implementation
- Kubebuilder issue #3721 — deprecation of `webhook.Validator` / `webhook.Defaulter` interfaces: https://github.com/kubernetes-sigs/kubebuilder/issues/3721
- Kubebuilder v4.3.0 release notes: https://github.com/kubernetes-sigs/kubebuilder/releases/tag/v4.3.0
- controller-runtime admission package docs: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/webhook/admission
- Kubebuilder installation docs (`go.kubebuilder.io/dl/...` download URL)

## Issues Found
1. **Deprecated/removed webhook interfaces (compile-breaking).** The "Webhook Validation" section implemented defaulting and validation by having the `Application` API type itself satisfy `webhook.Defaulter` (`func (r *Application) Default()`) and `webhook.Validator` (`func (r *Application) ValidateCreate()` etc.), with `var _ webhook.Defaulter = &Application{}` / `var _ webhook.Validator = &Application{}` and a bare `NewWebhookManagedBy(mgr).For(r).Complete()`. These object-implements-interface webhook interfaces were deprecated and removed from controller-runtime (v0.20+), so this code no longer compiles against current Kubebuilder/controller-runtime.

   **Fix applied:** Rewrote the section to use the current `webhook.CustomDefaulter` and `webhook.CustomValidator` interfaces implemented on dedicated `ApplicationCustomDefaulter` / `ApplicationCustomValidator` structs. The builder now wires them via `NewWebhookManagedBy(mgr).For(&Application{}).WithDefaulter(...).WithValidator(...).Complete()`, and the method signatures take a `context.Context` plus `runtime.Object` (with a type assertion to `*Application`), matching the current Kubebuilder-generated pattern: `Default(ctx, obj)`, `ValidateCreate(ctx, obj)`, `ValidateUpdate(ctx, oldObj, newObj)`, `ValidateDelete(ctx, obj)`. The defaulting/validation logic and the `+kubebuilder:webhook` markers were preserved unchanged.

## Review Notes
- The rest of the post is technically accurate and uses current APIs: the CRD `*_types.go` definitions and kubebuilder markers, the reconciler (Get/finalizer/SetControllerReference/Owns), `make` targets (`manifests`, `install`, `run`, `test`, `docker-build`, `docker-push`, `deploy`), the Kubebuilder install via `go.kubebuilder.io/dl/latest/...`, the `kubebuilder edit --plugins=helm/v1-alpha` helper, leader election options, the Prometheus metrics registration via `controller-runtime`'s `metrics.Registry`, `meta.SetStatusCondition` for status conditions, and the Ginkgo/Gomega envtest example.
- Minor (not changed, still valid): `intstr.FromInt(int(app.Spec.Port))` works but `intstr.FromInt32` is the newer non-deprecated helper for `int32` ports. Left as-is since it compiles and is functionally correct.
- Current Kubebuilder scaffolds webhooks under `internal/webhook/v1/` rather than `api/v1/`. The post keeps them in `api/v1/application_webhook.go`; this still works and the file location was left as the author wrote it to avoid restructuring the post.
- The very latest controller-runtime releases also offer generic (`Defaulter[T]` / `Validator[T]`) webhook helpers; the non-generic `CustomDefaulter`/`CustomValidator` form used in the fix remains valid and is the most widely documented, so it was chosen for stability.
