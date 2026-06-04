# Validation Summary: How to Use FieldManager to Track Which Controller Owns Which Fields

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes API
- Server-Side Apply
- kubectl
- client-go
- Go

## Sources Consulted
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- client-go typed apps/v1 package documentation: https://pkg.go.dev/k8s.io/client-go/kubernetes/typed/apps/v1
- client-go package Server-Side Apply example: https://pkg.go.dev/k8s.io/client-go

## Issues Found
- The `client-go` examples passed `*appsv1.Deployment` objects to `Deployments().Apply`, but current typed `client-go` expects `*applyconfigurations/apps/v1.DeploymentApplyConfiguration`. Updated both Go examples to use the generated `applyconfigurations` builders.
- The first Go example imported `k8s.io/client-go/rest` without using it. Removed the unused import as part of the `applyconfigurations` update.
- The `kubectl get ... -o yaml` and `kubectl get ... -o json` examples did not include `--show-managed-fields`, so modern kubectl output would omit `metadata.managedFields`. Added the flag where the post expects managed fields to be visible.
- The JSONPath example piped raw JSONPath output to `jq`, which is not a reliable JSON pipeline. Changed it to output JSON and select `.metadata.managedFields` with `jq`.
- The conflict-resolution section said there were two options, but Kubernetes documents three: force ownership, remove the field, or match the live value to share ownership. Added the missing shared-ownership option.
- The cleanup command removed a Helm release annotation rather than clearing `metadata.managedFields`. Replaced it with the documented merge patch pattern that overwrites `managedFields` with `[{}]`.

## Review Notes
- The post is technically relevant and covers current Kubernetes Server-Side Apply behavior.
- Kubernetes documentation strongly recommends that controllers force conflicts for objects they own and manage, but the post's conservative guidance to avoid force unless intentional is acceptable for multi-manager coordination examples.
