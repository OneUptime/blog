# Validation Summary: How to Deploy Models with MLflow

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- MLflow Model Registry
- MLflow Models and model signatures
- MLflow local model serving
- Docker
- Kubernetes Deployment, Service, Ingress, and HPA manifests
- AWS SageMaker deployment
- Python
- scikit-learn
- Flask

## Sources Consulted
- MLflow Model Registry documentation: https://mlflow.org/docs/latest/ml/model-registry/
- MLflow Model Registry workflow and stage deprecation guidance: https://mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow scikit-learn Python API: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- MLflow Model Signatures and Input Examples documentation: https://mlflow.org/docs/latest/ml/model/signatures/
- MLflow local inference server documentation: https://mlflow.org/docs/latest/ml/deployment/deploy-model-locally/
- MLflow CLI reference: https://mlflow.org/docs/latest/api_reference/cli.html
- MLflow SageMaker deployment documentation: https://mlflow.org/docs/latest/ml/deployment/deploy-model-to-sagemaker/
- MLflow SageMaker Python API: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sagemaker.html
- AWS SageMaker Runtime invoke_endpoint API documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sagemaker-runtime/client/invoke_endpoint.html
- Kubernetes API concepts and workload documentation: https://kubernetes.io/docs/concepts/

## Issues Found
- The post centered the deployment workflow on MLflow Model Registry stages. MLflow stages are deprecated as of MLflow 2.9.0 and the current docs recommend model version aliases and tags. I changed the registry lifecycle examples from stage transitions to aliases such as `candidate` and `champion`, and updated model URIs from `/Production` and `/Staging` to `@champion` and `@candidate`.
- The MLflow `mlflow.sklearn.log_model()` examples used `artifact_path=`, which is deprecated in the current API in favor of `name=`. I updated both model logging examples to use `name="model"`.
- The SageMaker examples used older `mlflow.sagemaker.deploy()`, `mlflow.sagemaker.predict()`, and `mlflow.sagemaker.delete()` calls. Current MLflow SageMaker deployment examples use `mlflow.deployments.get_deploy_client()` with `create_deployment()`, `predict()`, `update_deployment()`, and `delete_deployment()`. I updated the code accordingly.
- The Dockerfile health check used `curl` without installing it. I added `curl` to the apt packages so the health check command can run.
- The Kubernetes Ingress routed `/iris-classifier` to a backend that serves `/invocations`, which would usually forward the prefix unless an ingress rewrite is configured. I changed the example path to `/` to match the backend endpoints without requiring an omitted rewrite annotation.
- The Docker build example used `--enable-mlserver`, which is not present in the current MLflow CLI reference for `mlflow models build-docker`. I removed that flag and the associated outdated server wording.

## Review Notes
The updated post still includes a custom Flask serving script as an optional custom container pattern. That is technically valid, but production users should ensure `requirements.txt` includes `flask`, `gunicorn`, `mlflow`, `pandas`, and model dependencies, since the post references that file without showing its full contents.
