# Validation Summary: How to Use Server-Side Dry Run to Validate Kubernetes Manifests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API server dry run
- kubectl apply, delete, patch, diff
- Admission controllers and admission webhooks
- Kubernetes RBAC and impersonation
- Kubernetes ResourceQuota
- Pod Security Admission
- controller-runtime Go client
- Helm
- GitHub Actions

## Sources Consulted
- Kubernetes API Concepts - Dry-run: https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes PodSecurityPolicy removal documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- controller-runtime client package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client
- Kubernetes client-go rest package documentation: https://pkg.go.dev/k8s.io/client-go/rest
- Helm install reference: https://helm.sh/docs/v3/helm/helm_install/
- actions/checkout repository documentation: https://github.com/actions/checkout
- Azure/setup-kubectl repository documentation: https://github.com/Azure/setup-kubectl
- actions/github-script repository documentation: https://github.com/actions/github-script

## Issues Found
- The post described client-side dry run as "syntax only" and said server-side dry run catches "all issues" from a real apply. Updated this wording because kubectl documents client dry run as printing the object that would be sent without sending it, while server dry run submits the request without persistence; server dry run still has limitations.
- The validation list referenced Pod Security Policies. Replaced this with Pod Security Admission because PodSecurityPolicy was deprecated in Kubernetes v1.21 and removed in v1.25.
- The first Go snippet used `ptr.To` without importing `k8s.io/utils/ptr`. Added the missing import so the example is syntactically coherent.
- The impersonation Go snippet created a `rest.ImpersonationConfig` value but did not apply it to a client configuration. Changed the sample to accept a `*rest.Config`, copy it, set `config.Impersonate`, and create an impersonated controller-runtime client.
- The GitHub Actions sample used older action major versions. Updated `actions/checkout`, `azure/setup-kubectl`, and `actions/github-script` to current major versions shown in their official repositories.
- The Helm example used the obsolete/nonexistent `--dry-run-option=server` flag. Updated it to the current documented `helm install ... --dry-run=server` syntax.

## Review Notes
The dry-run behavior is accurate for current Kubernetes: mutating requests can use `dryRun=All`, admission/defaulting/validation runs, and changes are not persisted. Webhooks must declare dry-run-compatible side effects or dry-run requests can fail. The examples still assume a live cluster and appropriate credentials, which is expected for server-side dry run.
