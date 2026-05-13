# Validation Summary: How to Deploy Seldon Core for ML Model Serving with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Seldon Core 1
- Kubernetes
- Flux CD
- HelmRepository and HelmRelease
- Flux Kustomization
- Istio and Ambassador ingress integration
- SeldonDeployment custom resources
- Seldon prepackaged model servers for scikit-learn and TensorFlow Serving
- Prometheus metrics

## Sources Consulted
- Seldon Core 1 Quick Start Guide: https://docs.seldon.ai/seldon-core-1
- Seldon Core 1 Helm chart configuration: https://docs.seldon.ai/seldon-core-1/configuration/installation-parameters/advanced-helm-chart-configuration
- Seldon Core 1 prepackaged model servers: https://docs.seldon.ai/seldon-core-1/configuration/servers/overview
- Seldon Core 1 SKLearn Server documentation: https://docs.seldon.ai/seldon-core-1/configuration/servers/sklearn
- Seldon Core 1 TensorFlow Serving documentation: https://docs.seldon.ai/seldon-core-1/configuration/servers/tensorflow
- Seldon Core 1 Istio ingress documentation: https://docs.seldon.ai/seldon-core-1/configuration/routing/istio
- Seldon Core 1 metrics documentation: https://docs.seldon.ai/seldon-core-1/configuration/integrations/analytics
- Seldon Helm chart repository index: https://storage.googleapis.com/seldon-charts/index.yaml
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The HelmRelease used `version: "1.18.x"`, but the official Seldon chart repository does not publish a `1.18.x` `seldon-core-operator` chart. I changed it to the published `1.19.0` chart version.
- The Helm values under `executor.defaultEnv` did not match the Seldon Core 1 chart schema. I changed this to `executor.metricsPortName: metrics`, which is the documented chart value for naming the executor metrics port.
- The Helm values under `manager.resources.requests` and `manager.resources.limits` did not match the Seldon Core 1 chart schema. I changed them to the documented `manager.cpuRequest`, `manager.memoryRequest`, `manager.cpuLimit`, and `manager.memoryLimit` values.
- The TensorFlow Serving SeldonDeployment included `model_name` but omitted `signature_name`, which the Seldon Core 1 TensorFlow Serving REST documentation lists as required. I added `signature_name: serving_default`.
- The Flux Kustomization dependency comment implied the dependency was directly on the HelmRelease. Flux Kustomization `dependsOn` entries refer to other Flux Kustomization resources, so I clarified the comment.

## Review Notes
Seldon Core 2 is the current generation and Seldon documentation recommends it for new users, while this post intentionally uses Seldon Core 1 APIs such as `SeldonDeployment`. The examples are valid for a Seldon Core 1.19 style installation, assuming the referenced namespaces, model artifacts, S3 credential secret, Istio gateway, and Flux GitRepository exist. The local environment did not have `helm`, `flux`, `kubectl`, or `ruby` installed; YAML syntax was checked with Python's YAML parser, and CLI/config behavior was verified against official documentation and the Seldon chart repository metadata.
