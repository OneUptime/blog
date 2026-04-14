# Validation Summary: How to Uninstall Dapr from Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (control plane components, CLI, CRDs)
- Kubernetes (kubectl, namespaces, CRDs, annotations)
- Helm (chart uninstall)

## Sources Consulted
- Dapr Kubernetes overview: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr CLI reference (dapr uninstall): https://docs.dapr.io/reference/cli/dapr-uninstall/
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr component specs: https://docs.dapr.io/reference/resource-specs/
- Helm uninstall documentation: https://helm.sh/docs/helm/helm_uninstall/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found
No technical issues found.

## Review Notes
- The five control plane components listed (dapr-operator, dapr-sidecar-injector, dapr-placement, dapr-sentry, dapr-scheduler) are all confirmed in official Dapr documentation. The `dapr-scheduler` was introduced in Dapr 1.14.0; the post does not specify a version, which is fine.
- The "Removing Component Resources" section covers three of the five Dapr CRD resource types (components, subscriptions, configurations). Two additional types exist (`resiliencies.dapr.io` and `httpendpoints.dapr.io`) that are not mentioned. This is not an error since the post doesn't claim to be exhaustive, but users with those resources would need to clean them up as well.
- The CRD removal command (`kubectl get crds | grep dapr.io | awk '{print $1}' | xargs kubectl delete crd`) will produce a harmless error if no matching CRDs are found. Using `xargs -r` (GNU xargs) would prevent this, but it is a minor robustness concern rather than a correctness issue.
- All CLI flags (`-k`, `--namespace`), Helm commands, kubectl annotation removal syntax (trailing `-`), and verification commands are correct.
