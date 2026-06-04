# Validation Summary: How to use Kustomize buildMetadata for tracking overlay information

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- kubectl
- Prometheus / PromQL
- kube-state-metrics
- yq

## Sources Consulted
- Kustomize API types documentation for `buildMetadata` option constants: https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- Kustomize current release and CLI help output for v5.8.1: https://github.com/kubernetes-sigs/kustomize
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- kubectl command reference for `kubectl kustomize`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes JSONPath reference for escaping annotation keys: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- yq project documentation / CLI behavior: https://github.com/mikefarah/yq

## Issues Found
- The post used `config.kubernetes.io/transformations` for transformer metadata. Kustomize v5.8.1 uses `alpha.config.kubernetes.io/transformations`, so the option list, YAML examples, and kubectl JSONPath command were corrected.
- Several examples used deprecated `bases` and `commonLabels` fields. These were changed to `resources` and `labels` to match current Kustomize guidance and avoid v5.8.1 warnings.
- The managed-by label examples used `kustomize-v5.0.0`. They were updated to `kustomize-v5.8.1`, matching the current Kustomize release tested during review.
- Origin annotation examples incorrectly showed overlay `ref` entries and a full inheritance chain. Real Kustomize output records the resource source path in `config.kubernetes.io/origin`; transformer history is recorded separately when `transformerAnnotations` is enabled. The examples and explanatory text were corrected.
- The transformation annotation example used simplified pseudo-output. It was replaced with the actual `configuredIn` / `configuredBy` structure emitted by Kustomize.
- The performance comparison command used invalid `kustomize build -o buildMetadata=all` syntax. It was replaced with `kustomize edit add buildmetadata managedByLabel,originAnnotations,transformerAnnotations` followed by a normal build.
- The PromQL alert for missing labels looked for an empty label value, which does not detect absent label metrics. It was changed to an `unless on(namespace, deployment)` query.
- The section about excluding metadata used a Kustomize patch that does not actually exclude origin metadata, because the patch transformer records its own origin. It was corrected to describe a post-build `yq` filtering step.
- The unsupported claim that metadata increases manifest size by typically less than 5% was softened because no official source guarantees that percentage.

## Review Notes
The examples are validated against Kustomize v5.8.1 behavior. The exact `app.kubernetes.io/managed-by` label value is version-dependent, so readers using another Kustomize or kubectl-embedded Kustomize version should adjust label selectors accordingly.
