# Validation Summary: How to Train and Deploy a Model Using Azure Machine Learning Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Machine Learning SDK v2
- Azure Machine Learning pipelines
- Azure Machine Learning command components
- Azure Machine Learning managed online endpoints
- Python
- scikit-learn
- MLflow

## Sources Consulted
- Azure Machine Learning: Create and run machine learning pipelines using components with the Machine Learning SDK v2: https://learn.microsoft.com/en-gb/azure/machine-learning/how-to-create-component-pipeline-python?view=azureml-api-2
- Azure Machine Learning: How to use pipeline components in pipeline jobs: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-pipeline-component?view=azureml-api-2
- Azure Machine Learning: Deploy and score a machine learning model by using an online endpoint: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-online-endpoints?view=azureml-api-2
- Azure Machine Learning: Tutorial: Deploy a model as an online endpoint: https://learn.microsoft.com/en-us/azure/machine-learning/tutorial-deploy-model?view=azureml-api-2
- Azure Machine Learning: Safe rollout for online endpoints: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-safely-rollout-online-endpoints?view=azureml-api-2
- Azure Machine Learning environments documentation: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-environments?view=azureml-api-2

## Issues Found
- The pipeline decorator used `compute="cpu-cluster"`. Current Azure ML SDK v2 pipeline examples use `default_compute` at the pipeline level, so the snippet was changed to `default_compute="cpu-cluster"`.
- The component examples used an older Python 3.8 scikit-learn curated environment. The environment references were updated to the current Azure ML registry URI for the scikit-learn 1.5 Python 3.10 curated environment.
- The deployment example attempted to deploy a custom `joblib` model without a scoring script, code configuration, or inference environment. Azure ML managed online deployments for custom models require inference code with `init()` and `run()` and an environment that includes the inference server package, so `deployment/score.py`, `env/conda.yml`, `Environment`, and `CodeConfiguration` examples were added.
- The endpoint example did not set `auth_mode`. It was updated to specify key-based authentication explicitly.
- The deployment example did not assign endpoint traffic to the new deployment. A traffic update was added so requests route to the `blue` deployment.
- The wrap-up stated that each component is versioned. Because the snippets define inline command components rather than explicitly registering versioned component assets, this was softened to say components can be versioned.

## Review Notes
The tutorial still assumes the input folder contains `data.csv` and that the target column is the last column in the CSV. Those assumptions are reasonable for a concise example, but a production tutorial could make the schema and target column explicit.
