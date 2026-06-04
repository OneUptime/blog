# Validation Summary: How to Use Docker for ML Model Serving with BentoML

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BentoML
- Docker
- Docker Compose
- Python
- scikit-learn
- NumPy
- PyTorch
- Prometheus metrics
- Machine learning model serving

## Sources Consulted
- BentoML Services documentation: https://docs.bentoml.org/en/latest/build-with-bentoml/services.html
- BentoML adaptive batching documentation: https://docs.bentoml.org/en/latest/get-started/adaptive-batching.html
- BentoML scikit-learn API reference: https://docs.bentoml.org/en/latest/reference/bentoml/frameworks/sklearn.html
- BentoML build options reference: https://docs.bentoml.org/en/latest/reference/bentoml/bento-build-options.html
- BentoML CLI reference: https://docs.bentoml.org/en/latest/reference/bentoml/cli.html
- BentoML GPU inference documentation: https://docs.bentoml.org/en/latest/build-with-bentoml/gpu-inference.html
- BentoML monitoring endpoints documentation: https://docs.bentoml.org/en/latest/build-with-bentoml/observability/monitoring-and-data-collection.html
- BentoML metrics documentation: https://docs.bentoml.org/en/latest/build-with-bentoml/observability/metrics.html
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The service example used the legacy `bentoml.Service(..., runners=...)`, `to_runner()`, and `bentoml.io` style. Updated it to the current class-based `@bentoml.service` and `@bentoml.api` style, with `BentoModel` and `bentoml.sklearn.load_model`.
- Adaptive batching was enabled through the saved model signature, which is legacy runner behavior. Updated the serving endpoint to use `@bentoml.api(batchable=True)`, which is the current documented API.
- The model metadata stored a scikit-learn score directly. Cast it to `float(accuracy)` so the metadata value is a primitive Python type.
- The `bentoml serve` and `bentofile.yaml` service target referenced `service:svc`, which no longer existed after updating the service definition. Changed these references to `service:IrisClassifier`.
- The BentoML overview claimed multi-stage builds and automatic CUDA setup. Adjusted this to documented BuildKit support and GPU workload options.
- The GPU build example used deprecated `docker.cuda_version` and `--opt platform=...`. Replaced `cuda_version` with a PyTorch CUDA wheel index and changed the command to the documented `--platform` flag.
- The Docker Compose example used `container_name`, a host port mapping, an unmounted `BENTOML_CONFIG` path, and `deploy.replicas: 2` together in a way that would conflict with a reverse-proxy deployment. Removed the fixed container name, direct host port mapping, unmounted config variable, and replica setting while preserving resource limits and health checks.
- The Docker Compose snippet used the obsolete top-level `version` field. Removed it so the example follows the current Compose Specification.

## Review Notes
BentoML's current documentation recommends the newer Python SDK for runtime environment definitions, while `bentofile.yaml` remains supported. The post still uses `bentofile.yaml`, which is acceptable for this tutorial but could be modernized in a future rewrite.
