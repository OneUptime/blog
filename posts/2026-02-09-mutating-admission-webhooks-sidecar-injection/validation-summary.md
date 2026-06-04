# Validation Summary: How to Write Mutating Admission Webhooks to Inject Sidecar Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes admission webhooks
- Kubernetes MutatingWebhookConfiguration
- Kubernetes Pods, containers, init containers, volumes, labels, and annotations
- JSON Patch / RFC 6902
- Go Kubernetes API packages
- kubectl

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes Admission Controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- RFC 6902, JSON Patch: https://www.rfc-editor.org/rfc/rfc6902
- Go io/ioutil package documentation: https://pkg.go.dev/io/ioutil

## Issues Found
- The main Go snippet imported unused packages (`fmt`, `io/ioutil`, `net/http`) and created an unused `codecs` variable, which would make the snippet fail to compile. Removed the unused imports and variable.
- The main Go snippet used a `WebhookServer` receiver without defining the type in the shown code. Added a minimal `WebhookServer` type so the snippet is self-contained.
- The AdmissionResponse examples did not copy `request.uid` into `response.uid`. Kubernetes requires webhook responses to include the UID copied from the request, so each response now sets `UID: req.UID`.
- The `patches.go` snippet used `time.Now`, `time.RFC3339`, and `strings.Replace` without importing `time` and `strings`. Added the missing imports.
- The `injection.go` snippet imported `fmt` but did not use it. Removed the unused import.
- The environment-specific configuration example read from the annotations map without a nil guard. Reading a nil map is allowed in Go, but the post describes customization based on optional pod metadata; added an explicit nil check for clarity and consistency with the earlier injection guard.
- The MutatingWebhookConfiguration used `objectSelector` to match `sidecar.example.com/inject`, but Kubernetes object selectors match labels, not annotations. Because the test Pod only sets that value as an annotation, the webhook would be skipped. Removed the objectSelector and left annotation gating to the webhook logic.
- The test Pod used the `default` namespace while the webhook configuration included a `namespaceSelector` requiring `sidecar-injection=enabled`. Added a `kubectl label namespace default sidecar-injection=enabled --overwrite` command before creating the test Pod.
- The conclusion suggested using object selectors generally for injection control. Updated the wording to clarify that object selectors are label-based.

## Review Notes
The webhook configuration uses current `admissionregistration.k8s.io/v1` fields, valid `sideEffects: None`, and valid `failurePolicy: Ignore`. The Go and kubectl examples were checked against official documentation, but could not be executed locally because `go` and `kubectl` are not installed in this workspace.
