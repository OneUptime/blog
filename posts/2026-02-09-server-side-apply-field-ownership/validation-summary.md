# Validation Summary: How to Use Server-Side Apply to Manage Field Ownership in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Server-Side Apply
- kubectl
- Go
- controller-runtime client

## Sources Consulted
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- kubectl apply generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl get generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- controller-runtime client package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client

## Issues Found
- The field manager example used `kubectl-client-side-apply` as the explicit manager for server-side apply. Changed it to `my-automation` and clarified that kubectl supplies a default manager while server-side apply requests still use a field manager identity.
- The command for viewing `managedFields` used `kubectl get deployment webapp -o yaml`, but current kubectl hides managed fields by default. Added `--show-managed-fields`.
- The conflict examples used `ptr.To(...)` without showing the required helper import. Replaced those calls with local variables and pointers so the snippets are syntactically self-contained.
- The label removal example included an `app` label while demonstrating removal of `managed-by`, which could assert ownership of an unrelated label or conflict with another manager. Changed the snippet to omit the previously owned label without claiming another label.

## Review Notes
The article's core explanation of field ownership, conflicts, force ownership, dry run, and associative list behavior for containers matches the Kubernetes Server-Side Apply documentation. The Go snippets use controller-runtime patch options that remain available, though newer controller-runtime versions also expose generated apply-configuration based apply helpers.
