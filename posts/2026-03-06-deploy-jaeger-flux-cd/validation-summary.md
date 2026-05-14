# Validation Summary: How to Deploy Jaeger with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository resources
- Jaeger Operator
- Jaeger distributed tracing
- Elasticsearch
- cert-manager
- NGINX Ingress
- OpenTelemetry OTLP export

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Jaeger Operator documentation: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Jaeger deployment and Elasticsearch storage documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger Helm chart repository index: https://jaegertracing.github.io/helm-charts/index.yaml
- Elastic Helm chart repository index: https://helm.elastic.co/index.yaml
- Elastic Stack Helm chart documentation: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/managing-deployments-using-helm-chart
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/

## Issues Found
- The Elasticsearch JVM heap comment said the heap was half of the memory limit, but the example used `-Xmx1g -Xms1g` with a `4Gi` memory limit. Changed it to `-Xmx2g -Xms2g`.
- The Jaeger rollover configuration omitted `es.use-aliases`, which the Jaeger Operator documentation requires for rollover jobs. Added `use-aliases: true`.
- The application example described a sidecar while the Jaeger instance configured the agent as a DaemonSet. Updated the example to use the node IP via `status.hostIP` and point remote sampling at the local DaemonSet agent.
- The Flux Kustomization used `targetNamespace: jaeger`, which would override namespaced resources in the path, including objects intended for `flux-system`. Removed `targetNamespace` because the manifests already set their namespaces explicitly.
- The Flux health check used the wrong Jaeger Operator Deployment name. The `jaeger-operator` chart renders the Deployment as `jaeger-operator` when the release name is `jaeger-operator`; updated the health check accordingly.
- The conclusion described Elasticsearch ILM and adaptive sampling, but the configuration uses Jaeger index cleanup/rollover and per-service sampling strategies. Updated the wording to match the configuration.

## Review Notes
The standalone `elastic/elasticsearch` Helm chart used in the post still exists in the Elastic Helm repository, but its latest 8.x chart is old compared with current ECK-based Elastic deployment guidance. A future revision should consider moving the Elasticsearch deployment to ECK if the post is meant to reflect current Elastic production recommendations.
