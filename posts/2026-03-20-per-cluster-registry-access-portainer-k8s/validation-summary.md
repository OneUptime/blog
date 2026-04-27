# Validation Summary: How to Configure Per-Cluster Registry Access in Portainer for Kubernetes

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Portainer (multi-cluster Kubernetes management)
- Kubernetes (Secrets, ServiceAccounts, imagePullSecrets)
- kubectl CLI
- Container registries (ECR, Docker Hub, private registries)

## Sources Consulted
- Portainer Kubernetes registries docs: https://docs.portainer.io/user/kubernetes/cluster/registries
- Portainer admin registries docs: https://docs.portainer.io/admin/registries
- Kubernetes "Pull an Image from a Private Registry": https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- kubectl patch reference (JSON merge patch on ServiceAccount imagePullSecrets)

## Issues Found
No technical issues found.

The Portainer workflow described (add registries globally under Settings > Registries, then assign access per-environment via Environments > Edit > Registries) matches official Portainer documentation. Per-namespace registry assignment is also a real feature in Portainer's Kubernetes environments.

The Kubernetes Secret YAML uses the correct `kubernetes.io/dockerconfigjson` type and the correct `.dockerconfigjson` data key.

The `kubectl create secret docker-registry` command uses valid flags (`--docker-server`, `--docker-username`, `--docker-password`, `--docker-email`, `--namespace`). Note that `--docker-email` is optional in modern kubectl, but it remains a valid flag.

The `kubectl patch serviceaccount` command uses correct JSON merge patch syntax to attach an `imagePullSecrets` entry to the default ServiceAccount.

The verification commands (`kubectl get secrets --all-namespaces` and `kubectl describe pod ... | grep "Image Pull Secrets"`) are accurate; kubectl renders the field label as "Image Pull Secrets" in title case in the human-readable describe output.

## Review Notes
- The example secret name `portainer-registry-secret` is illustrative — Portainer's actual auto-generated registry secrets typically use a `registry-<id>` naming pattern, but the post correctly frames this as a representative example ("Portainer creates a secret like this automatically") rather than asserting a fixed name.
- `--docker-email` is no longer required by the Docker registry V2 protocol; future revisions could omit it from the example to reflect current best practice, but it is not technically wrong as written.
- When a pod has no image pull secrets, some kubectl versions omit the "Image Pull Secrets" line entirely from describe output rather than printing `<none>`. The grep-based verification still works when secrets are attached, which is the intended check.
