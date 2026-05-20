# Validation Summary: How to Implement Resource Budgets per Team with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD AppProjects
- Argo CD ApplicationSets
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Helm templating
- Prometheus Operator PrometheusRule
- kube-state-metrics / PromQL
- Argo CD notifications

## Sources Consulted
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet Templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Prometheus Operator API Reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The "Handling Budget Overruns" section said new pods cannot be scheduled when a namespace hits quota. Kubernetes ResourceQuota enforcement happens at admission: create or update requests that violate quota are rejected with HTTP 403. For controllers such as Deployments, the controller can exist but fail to create all managed Pods. Updated the wording to say quota-tracked objects cannot be created and that Argo CD may show Progressing or Degraded depending on application health.

## Review Notes
- The Kubernetes ResourceQuota and LimitRange manifests use current `apiVersion: v1` APIs and valid resource names such as `requests.cpu`, `limits.memory`, `persistentvolumeclaims`, `services.loadbalancers`, and `services.nodeports`.
- The ApplicationSet uses the current `argoproj.io/v1alpha1` API and valid list-generator template substitution syntax.
- The PrometheusRule snippet is structurally valid for Prometheus Operator, assuming the Prometheus instance is configured to select rules from the namespace and labels where it is applied.
- The PromQL examples rely on kube-state-metrics exposing `kube_resourcequota` metrics.
