# Validation Summary: How to Configure KServe InferenceService with Custom Transformer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- KServe InferenceService
- KServe Python SDK
- Docker
- PyTorch
- Prometheus metrics
- kubectl

## Sources Consulted
- KServe custom transformer documentation: https://kserve.github.io/website/docs/model-serving/predictive-inference/transformers/custom-transformer
- KServe Python Runtime SDK API: https://kserve.github.io/website/docs/reference/python-runtime-sdk/python-runtime-sdk-api
- KServe v1beta1 API source for InferenceServiceSpec and ComponentExtensionSpec: https://github.com/kserve/kserve/tree/release-0.18/pkg/apis/serving/v1beta1
- KServe v0.18.0 package on PyPI: https://pypi.org/project/kserve/0.18.0/
- PyTorch CPU wheel index: https://download.pytorch.org/whl/cpu
- Docker build CLI help output

## Issues Found
- The transformer and predictor handler signatures did not accept request headers. KServe calls `preprocess`, `predict`, and `postprocess` with headers, so the examples would raise `TypeError`. Updated the method signatures to include optional headers and response headers where appropriate.
- The transformer was not marked ready before `ModelServer.start`. Current KServe requires at least one registered model to be ready. Added `load()` return values and called `transformer.load()` before starting the server.
- The predictor registered the model as `sentiment-predictor`, while the InferenceService and transformer route requests using `sentiment-analysis`. Updated the predictor to parse `--model_name` from the KServe model server parser and configured both containers with `--model_name sentiment-analysis`.
- Health check paths used container-specific names that did not match the registered model endpoint. Updated probes to `/v1/models/sentiment-analysis`.
- The KServe SDK version was pinned to outdated `kserve==0.11.0`. Updated examples to `kserve==0.18.0`, the current release verified from PyPI.
- The predictor Dockerfile used `--index-url` for both KServe and Torch, which would prevent pip from finding KServe on PyPI. Split the install into separate pip commands.
- The PyTorch CPU wheel version `torch==2.0.0` did not resolve from the PyTorch CPU wheel index in validation. Updated it to `torch==2.3.1+cpu`, which resolves from the official CPU index.
- Autoscaling fields were placed at the top level of `spec`, but KServe defines `scaleTarget`, `scaleMetric`, `minReplicas`, and `maxReplicas` on component extension specs. Moved them under both `transformer` and `predictor`.
- The monitoring snippet referenced an undefined `_do_preprocessing` helper and used an outdated handler signature. Replaced it with a valid wrapper pattern.
- The final log-follow command referenced a specific deployment name that may not exist across KServe deployment modes. Updated it to use the component label selector.

## Review Notes
- The sentiment model remains illustrative and initializes random weights unless trained weights are loaded from storage, so the exact sample scores are representative rather than deterministic.
- The tutorial uses KServe v1 REST request/response format. KServe also supports v2/Open Inference Protocol, but the v1 examples are valid for this pipeline.
