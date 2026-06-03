# Validation Summary: How to Set Up Seldon Core for Multi-Model Serving with Custom Inference Graphs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Seldon Core 1 and SeldonDeployment custom resources
- Kubernetes, kubectl, and Kubernetes services
- Helm chart installation
- Python Seldon Core language wrapper
- Seldon Core transformers, combiners, output transformers, and A/B traffic splitting
- Prometheus and Grafana metrics queries
- NVIDIA Triton Inference Server with GPU scheduling

## Sources Consulted
- Seldon Core 1 installation documentation: https://docs.seldon.ai/seldon-core-1/getting-started/installation/installation
- Seldon Core 1 inference graph documentation: https://docs.seldon.ai/seldon-core-1/configuration/routing/inference-graph
- Seldon Core 1 Python inference class documentation: https://docs.seldon.ai/seldon-core-1/v1.19/configuration/wrappers-and-sdks/python-language-wrapper/python_component
- Seldon Core 1 Dockerfile wrapper documentation: https://docs.seldon.ai/seldon-core-1/configuration/wrappers-and-sdks/python-language-wrapper/python_wrapping_docker
- Seldon Core 1 Prometheus metrics documentation: https://docs.seldon.ai/seldon-core-1/configuration/integrations/analytics
- Seldon Core 1 Triton server documentation: https://docs.seldon.ai/seldon-core-1/configuration/servers/triton
- Seldon Core 1 SeldonDeployment CRD reference: https://docs.seldon.ai/seldon-core-1/reference/seldon-deployment-crd
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- Helm install reference: https://docs.helm.sh/docs/helm/helm_install/

## Issues Found
- The prediction test used the in-cluster DNS name `sklearn-iris-default.seldon.svc.cluster.local` from a workstation command. That service name only resolves inside the cluster unless DNS/networking is configured for it. Changed the example to use `kubectl port-forward` and call `localhost:8000`.
- The transformer Dockerfile copied `transformer.py` and started `seldon-core-microservice transformer`, but the Python wrapper expects the model argument to match the Python file/class name. Renamed the snippet to `FeatureTransformer.py`, copied that file, and started `FeatureTransformer`.
- The complex inference graph was not deployable as written because custom graph nodes such as validators and transformers had no corresponding `componentSpecs` containers. Added container entries for the custom components and model resources for the prepackaged predictor.
- The complex inference graph placed the postprocessor as a child after the model in a way that did not match Seldon's output-transformer pattern. Reordered the graph so the `OUTPUT_TRANSFORMER` wraps the predictor child and transforms the model response.
- The Prometheus query `seldon_deployment_replicas` is not one of Seldon Core's documented executor metrics. Replaced it with a kube-state-metrics deployment replica query.
- The outlier detector initialized `mean` and `std` to `None`, which would fail when computing z-scores. Added concrete example statistics so the snippet is runnable.
- The outlier detector used `predict` and returned `(X, meta)` for a transformer. Updated it to implement `transform_input` and return a `SeldonResponse` with request-specific tags, matching the documented Python wrapper extension points.
- The outlier detection deployment omitted the classifier container from `componentSpecs`. Added it so the graph child has a matching component specification.
- The Triton example omitted `spec.protocol: v2`, which Seldon's Triton documentation uses for the prepackaged Triton server. Added the protocol setting.

## Review Notes
Seldon Core V2 is now the recommended starting point in the current Seldon documentation, while this article uses the Seldon Core 1 `SeldonDeployment` API. That is still technically valid for Core 1 users, but future updates should make the version scope explicit. Helm and kubectl were not installed in the local review environment, so CLI syntax was checked against official command references rather than local `--help` output.
