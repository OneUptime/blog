# Validation Summary: How to Bring Your Own Model to SageMaker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SageMaker custom training containers
- Amazon SageMaker custom inference containers
- Amazon ECR
- AWS CLI
- Docker
- Python
- Flask
- pandas
- NumPy
- scikit-learn
- SageMaker Python SDK

## Sources Consulted
- Amazon SageMaker AI Developer Guide: Containers with custom training algorithms - https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-training-algo.html
- Amazon SageMaker AI Developer Guide: How SageMaker AI runs your training image - https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-training-algo-dockerfile.html
- Amazon SageMaker AI Developer Guide: How SageMaker AI provides training information - https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-training-algo-running-container.html
- Amazon SageMaker AI Developer Guide: How SageMaker AI processes training output - https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-training-algo-output.html
- Amazon SageMaker AI Developer Guide: Custom inference code with hosting services - https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-inference-code.html
- Amazon SageMaker AI Developer Guide: Adapt your own inference container - https://docs.aws.amazon.com/sagemaker/latest/dg/adapt-inference-container.html
- Amazon ECR User Guide: Moving an image through its lifecycle in Amazon ECR - https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html
- AWS CLI Command Reference: ecr create-repository - https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html
- AWS CLI Command Reference: sts get-caller-identity - https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- SageMaker Python SDK: Estimators - https://sagemaker.readthedocs.io/en/stable/api/training/estimators.html
- SageMaker Python SDK: Model - https://sagemaker.readthedocs.io/en/stable/api/inference/model.html
- Flask API documentation - https://flask.palletsprojects.com/en/stable/api/
- scikit-learn API reference: GradientBoostingClassifier - https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.GradientBoostingClassifier.html

## Issues Found
- The key path list described `/opt/ml/output/` generically. Updated it to distinguish `/opt/ml/output/data/` for additional output artifacts and `/opt/ml/output/failure` for failure details, matching SageMaker training output documentation.
- The training Dockerfile set `SAGEMAKER_PROGRAM` even though the example does not install or use the SageMaker Training Toolkit. Removed the unused environment variables to avoid implying that the toolkit is active.
- The inference Dockerfile used Gunicorn directly, but SageMaker appends `serve` as an argument to inference containers. With Docker exec-form `ENTRYPOINT`, that argument would be passed to Gunicorn. Changed the entrypoint to run `serve.py` directly, which tolerates the appended argument and starts the server on port 8080.
- The ECR commands created, built, tagged, and pushed only the inference image, but the later SageMaker SDK example referenced both `custom-ml-model-training` and `custom-ml-model`. Updated the ECR section to create, build, tag, and push both repositories/images.
- The SageMaker SDK example used `boto3.client(...)` without importing `boto3`. Added the missing import.

## Review Notes
- Python code snippets were syntax-checked with `python3` AST parsing.
- The inference example now uses Flask's built-in server for simplicity. For production workloads, a process manager or WSGI server wrapper that explicitly handles SageMaker's container arguments would be preferable.
