# Validation Summary: How to Deploy OpenFaaS Functions with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- OpenFaaS Standard / Enterprise
- OpenFaaS Function CRDs
- OpenFaaS Helm chart
- Kustomize
- Sealed Secrets
- PrometheusRule

## Sources Consulted
- OpenFaaS Function CRD documentation: https://docs.openfaas.com/openfaas-pro/function-crd/
- OpenFaaS Helm chart values: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/values.yaml
- OpenFaaS Pro Helm values: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/values-pro.yaml
- OpenFaaS Helm chart repository index: https://openfaas.github.io/faas-netes/index.yaml
- OpenFaaS autoscaling documentation: https://docs.openfaas.com/architecture/autoscaling/
- OpenFaaS async invocation documentation: https://docs.openfaas.com/reference/async/
- OpenFaaS metrics documentation: https://docs.openfaas.com/architecture/metrics/
- OpenFaaS secrets documentation: https://docs.openfaas.com/reference/secrets/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD resource health customization documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The guide described the Function CRD/operator flow as generic OpenFaaS, but current OpenFaaS documentation presents the operator and Function CRD GitOps workflow as OpenFaaS Standard / Enterprise functionality. Updated the text and Helm values to make that requirement explicit.
- The Helm chart version `14.2.0` was not present in the current official OpenFaaS chart index. Updated the Argo CD Application to use `15.0.6`, the current chart version found in the official index at validation time.
- The OpenFaaS Helm values mixed unsupported autoscaler and ingress fields. Replaced `autoscaler.rules` with `autoscaler.defaultTarget` and updated the ingress values to the chart's Kubernetes Ingress-style `hosts[].http.paths[].backend.service` structure.
- The scaling label `com.openfaas.scale.factor` is not part of the documented OpenFaaS Pro autoscaling labels. Replaced it with documented `com.openfaas.scale.type` and `com.openfaas.scale.target` labels.
- The async section described only NATS Streaming and changed `queueWorker.ackWait`, which the current chart warns not to change for Community Edition. Updated the text to mention NATS JetStream or NATS Streaming depending on edition, kept queue worker resources under `queueWorker`, and moved concurrency to documented `queueWorkerPro.maxInflight`.
- The Prometheus alert expressions did not aggregate by function, despite using `function_name` in annotations. Updated the error-rate and latency PromQL to aggregate by `function_name`, and by `le` for histogram buckets.
- The Argo CD health check used `status.replicas` only and treated scale-to-zero functions as Healthy. Replaced it with the condition-based health check from the OpenFaaS Function CRD documentation, including Degraded, Suspended, and Progressing states.

## Review Notes
- The snippets still assume the Argo CD `serverless` AppProject, Prometheus Operator CRDs, Sealed Secrets controller, OpenFaaS credentials/license requirements, DNS, and ingress controller are already installed and configured.
