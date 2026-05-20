# Validation Summary: How to Use Bitnami Sealed Secrets Controller with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- Kustomize
- Bitnami Sealed Secrets
- kubeseal CLI
- Helm
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Bitnami Sealed Secrets official README: https://github.com/bitnami-labs/sealed-secrets
- Bitnami Sealed Secrets Helm repository index: https://bitnami-labs.github.io/sealed-secrets/index.yaml
- Bitnami Sealed Secrets Helm chart package for 2.14.0 and 2.18.5: https://github.com/bitnami-labs/sealed-secrets/releases
- kubeseal CLI help output for v0.24.5 and v0.36.6 from official GitHub release binaries: https://github.com/bitnami-labs/sealed-secrets/releases
- kubeseal source code for v0.36.6: https://github.com/bitnami-labs/sealed-secrets/blob/v0.36.6/cmd/kubeseal/main.go
- Argo CD Helm Application documentation: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/helm/
- Argo CD ApplicationSet specification and generators documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Kubernetes kubectl reference for `kubectl create secret generic`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The Argo CD examples pinned the Sealed Secrets Helm chart to `2.14.0`, which is an old 2023 chart release. Updated both examples to the current chart version `2.18.5` from the official Helm repository index.
- The re-encryption script fetched a public certificate and passed it with `kubeseal --re-encrypt --cert`. Current `kubeseal --re-encrypt` uses the controller endpoint to re-encrypt with the latest cluster key and does not use the `--cert` path. Removed the unnecessary certificate fetch and changed the command to pass the controller name and namespace directly.

## Review Notes
- The Sealed Secrets scope descriptions, annotations, key renewal behavior, backup command, and `kubeseal` sealing commands match the official Sealed Secrets documentation.
- The Argo CD Application and ApplicationSet snippets use valid `argoproj.io/v1alpha1` resource shapes.
- Enabling `metrics.serviceMonitor.enabled` requires the Prometheus Operator `ServiceMonitor` CRD to be installed in the target cluster.
