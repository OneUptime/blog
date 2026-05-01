# Validation Summary: How to Deploy Seldon Core on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Seldon Core 1
- Prometheus Operator
- Scikit-learn model serving
- TensorFlow Serving
- XGBoost model serving

## Sources Consulted
- Seldon Core 1 installation docs: https://docs.seldon.ai/seldon-core-1/getting-started/installation/installation
- Seldon Core 1 Helm chart configuration docs: https://docs.seldon.ai/seldon-core-1/configuration/installation-parameters/advanced-helm-chart-configuration
- Seldon Core 1 prepackaged model server overview: https://docs.seldon.ai/seldon-core-1/configuration/servers/overview
- Seldon Core 1 SKLearn server docs: https://docs.seldon.ai/seldon-core-1/configuration/servers/sklearn
- Seldon Core 1 TensorFlow Serving docs: https://docs.seldon.ai/seldon-core-1/configuration/servers/tensorflow
- Seldon Core 1 inference graph docs: https://docs.seldon.ai/seldon-core-1/configuration/routing/inference-graph
- Seldon Core 1 serving and endpoint docs: https://docs.seldon.ai/seldon-core-1/configuration/deployments/serving
- Seldon Core 1 external prediction API docs: https://docs.seldon.ai/seldon-core-1/reference/prediction-apis/external-prediction
- Seldon Core 1 Prometheus metrics docs: https://docs.seldon.ai/seldon-core-1/configuration/integrations/analytics
- Official Seldon Helm chart values: https://raw.githubusercontent.com/SeldonIO/helm-charts/master/helm-charts/seldon-core-operator/values.yaml
- Official SeldonDeployment Go types / CRD source: https://raw.githubusercontent.com/SeldonIO/seldon-core/master/operator/apis/machinelearning.seldon.io/v1/seldondeployment_types.go
- Official Seldon chart index: https://storage.googleapis.com/seldon-charts/index.yaml

## Issues Found
- The install command used `executor.defaultEnvSecretRefName`, but the documented Helm value is `predictiveUnit.defaultEnvSecretRefName`. I corrected the value path and updated the operator chart version from `1.15.0` to the documented `1.19.0` release line.
- The post deployed resources into `ml-models` without creating that namespace. I added `kubectl create namespace ml-models`.
- The Scikit-Learn manifest placed `resources` under `spec.predictors[].graph`, which is not part of the SeldonDeployment graph schema. I moved the resource settings into `componentSpecs.spec.containers[]`, which is the documented way to override resources for prepackaged servers.
- The iris example referenced an arbitrary S3 path even though the post did not set up object-storage credentials. I switched that model URI to Seldon’s documented public GCS iris model so the walkthrough and test request align.
- The TensorFlow example used `model_version`, which is not documented for `TENSORFLOW_SERVER` in Seldon Core 1. I replaced it with `signature_name` and kept `model_name`, matching the official TensorFlow Serving guidance.
- The pipeline example declared a `COMBINER` node without a combiner implementation and used it for a simple sequential chain. I replaced it with a valid two-stage sequential graph using `MODEL` nodes.
- The test step tried to curl a ClusterIP service directly even though the install step disabled both Istio and Ambassador. I changed the test flow to `kubectl port-forward` the predictor service locally before sending the request.
- The monitoring example used `ServiceMonitor` with `endpoints`, but Seldon Core 1’s Prometheus integration documents `PodMonitor` with `podMetricsEndpoints` for these metrics. I corrected the manifest accordingly.

## Review Notes
- Seldon Core 1 is still documented, but Seldon Core 2 is the current platform line. For new deployments, Seldon’s docs increasingly steer users toward the Open Inference Protocol (`protocol: v2`) where practical.
- The A/B, TensorFlow, and pipeline examples still use placeholder model artifact URIs. They are syntactically correct after the fixes, but private object storage will still require credentials or cloud-native IAM configuration.
