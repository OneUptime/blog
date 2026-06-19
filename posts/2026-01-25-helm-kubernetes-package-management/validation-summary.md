# Validation Summary: How to Use Helm for Kubernetes Package Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Helm
- Helm charts and repositories
- Bitnami NGINX Helm chart
- GitHub Actions
- Azure Kubernetes GitHub Actions
- JSON Schema

## Sources Consulted
- Helm install documentation: https://helm.sh/docs/intro/install/
- Helm install CLI reference: https://helm.sh/docs/helm/helm_install/
- Helm chart format documentation: https://helm.sh/docs/topics/charts/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Helm stable chart repository deprecation/troubleshooting documentation: https://helm.sh/docs/v3/faq/troubleshooting/
- Bitnami NGINX chart source and values: https://github.com/bitnami/charts/tree/main/bitnami/nginx
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Azure setup-helm action documentation: https://github.com/Azure/setup-helm
- Azure k8s-set-context action documentation: https://github.com/Azure/k8s-set-context

## Issues Found
- The Linux installation command used Helm's `get-helm-3` script. Helm's current install documentation points to `get-helm-4`, so the command was updated.
- The repository setup listed the legacy `stable` repository. Helm documentation describes the stable chart repository as an unsupported archive, so it was replaced with the actively maintained ingress-nginx chart repository.
- The Bitnami NGINX values example used an old image tag and `service.port`. The current Bitnami chart uses `image.tag: 1.29.1-debian-12-r0` and `service.ports.http` / `service.ports.https`, so those fields were updated.
- The ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Kubernetes now uses `spec.ingressClassName`, and the Bitnami chart exposes this as `ingress.ingressClassName`, so the example was updated.
- The GitHub Actions workflow used older Azure action major versions and omitted `method: kubeconfig` for `azure/k8s-set-context`. The example was updated to `azure/setup-helm@v5`, `azure/k8s-set-context@v5`, and an explicit kubeconfig method.
- The `values.schema.json` example was fenced as YAML and included a YAML-style filename comment. It was changed to a JSON fence with valid JSON content.

## Review Notes
The Helm CLI examples for install, upgrade, rollback, release inspection, linting, templating, packaging, and hooks match the documented command forms. The chart versions `15.0.0` and `16.0.0` for `bitnami/nginx` still appear in the Bitnami chart index, though they are older than the current chart release.
