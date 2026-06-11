# Validation Summary: How to Build Model Deployment Pipelines

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Python
- MLflow Model Registry
- scikit-learn
- FastAPI
- Prometheus
- Docker
- GitHub Actions
- Kubernetes
- Horizontal Pod Autoscaler
- Blue-green and canary deployments

## Sources Consulted
- MLflow scikit-learn API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- MLflow Model Registry documentation: https://mlflow.org/docs/latest/ml/model-registry/
- MLflow Model Registry workflow and stage migration documentation: https://mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow client API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.client.html
- Dockerfile reference for HEALTHCHECK: https://docs.docker.com/reference/dockerfile/
- Docker GitHub Actions tag and label documentation: https://docs.docker.com/build/ci/github-actions/manage-tags-labels/
- GitHub Actions workflow syntax for service containers: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- FastAPI CORS documentation: https://fastapi.tiangolo.com/tutorial/cors/
- Prometheus client library documentation: https://prometheus.io/docs/instrumenting/clientlibs/
- Kubernetes Horizontal Pod Autoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The MLflow registry example passed a file path to `mlflow.sklearn.log_model(sk_model=...)`, but the API expects a trained scikit-learn model object. Updated the argument and docstring accordingly.
- The MLflow example used deprecated model registry stages via `transition_model_version_stage` and `artifact_path`. Updated the examples to use `name` for model logging and registered model aliases/tags for deployment state.
- Later orchestration code called `load_model` and rollback lookup methods that were not defined in the registry example. Added compatible registry helper methods.
- The PSI drift calculation could fail on constant-valued features because percentile bins were not unique. Added unique bins, a constant-feature fallback, and open-ended boundary bins.
- The Dockerfile used `curl` in `HEALTHCHECK` but did not install `curl` in the runtime image. Added a minimal runtime install.
- The FastAPI CORS configuration used wildcard origins/methods/headers with `allow_credentials=True`, which FastAPI documents as invalid. Set credentials to false for the wildcard example.
- The FastAPI app returned the current production model version even when serving a requested historical version. Updated prediction flow to return the resolved model version.
- Kubernetes annotations scraped `/metrics`, but the FastAPI app did not expose that endpoint. Added a Prometheus metrics endpoint using the configured registry.
- The GitHub Actions build job exported all Docker metadata tags as a single service image value. Changed the job output to a single image reference and added GHCR credentials for the service container.
- The integration-test command used `pytest --base-url` without installing a plugin that provides that option. Replaced it with a `BASE_URL` environment variable.

## Review Notes
The examples remain illustrative and assume project-specific scripts, manifests, metric collectors, deployment clients, and traffic-management implementations exist. The Kubernetes HPA uses the current stable `autoscaling/v2` API, and the blue-green/canary snippets are reasonable patterns but would still need infrastructure-specific traffic routing details before production use.
