# Validation Summary: How to Implement Model Explainability Endpoints with KServe Explainer Containers

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- KServe InferenceService and explainer containers
- KServe Python Runtime SDK
- Python
- SHAP
- LIME
- Docker
- Prometheus client metrics

## Sources Consulted
- KServe Control Plane API / CRD reference: https://kserve.github.io/website/docs/reference/crd-api
- KServe Python Runtime SDK API: https://kserve.github.io/website/docs/reference/python-runtime-sdk/python-runtime-sdk-api
- KServe Alibi explainer examples: https://kserve.github.io/website/docs/model-serving/predictive-inference/explainers/alibi/tabular-explainer
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait
- Docker build and push documentation: https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/
- Docker image push reference: https://docs.docker.com/engine/reference/commandline/image_push/
- SHAP TreeExplainer documentation: https://shap.readthedocs.io/en/latest/generated/shap.TreeExplainer.html
- LIME tabular explainer documentation: https://lime-ml.readthedocs.io/en/latest/lime.html#lime.lime_tabular.LimeTabularExplainer.explain_instance
- Prometheus Python client documentation: https://prometheus.github.io/client_python/instrumenting/counter/ and https://prometheus.github.io/client_python/instrumenting/histogram/

## Issues Found
- The SHAP explainer attempted to call `instance.tolist()` even though request instances from JSON are plain Python lists. Changed this to `np.asarray(instance).tolist()` so the example works for list input and NumPy input.
- The LIME explainer used `top_labels=1` but then read class `1` from `exp.intercept` and `exp.predict_proba`. LIME ignores `labels` when `top_labels` is set, so this can fail when the top predicted class is not class `1`. Changed the call to `labels=(1,)` so the extracted positive-class fields match the explanation generated.
- The visual explainer loaded a pickle file but did not import `pickle`. Added the missing import.

## Review Notes
- The KServe `InferenceService` examples use valid `serving.kserve.io/v1beta1` predictor and explainer fields, including custom explainer containers and component URLs.
- The Docker and kubectl commands are syntactically valid. The curl examples assume the returned KServe URLs are directly reachable from the caller's network; in clusters using an external ingress gateway, users may need ingress host and port variables as shown in KServe's official examples.
- The SHAP examples are appropriate for tree-based models, but SHAP output shapes and `expected_value` behavior can vary by model type and SHAP version. The post's examples are suitable as a binary-classification-oriented starting point.
