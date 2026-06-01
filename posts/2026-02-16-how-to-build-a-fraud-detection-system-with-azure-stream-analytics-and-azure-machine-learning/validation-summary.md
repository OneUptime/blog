# Validation Summary: How to Build a Fraud Detection System with Azure Stream Analytics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Stream Analytics
- Azure Event Hubs
- Azure Machine Learning managed online endpoints
- Azure CLI
- Azure Functions Service Bus triggers
- Azure Service Bus queues
- Azure Cosmos DB
- Power BI
- Python
- LightGBM
- MLflow
- scikit-learn

## Sources Consulted
- Microsoft Learn: Azure CLI `az eventhubs eventhub` reference, https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az eventhubs namespace` reference, https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az ml model` reference, https://learn.microsoft.com/en-us/cli/azure/ml/model?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az ml online-endpoint` reference, https://learn.microsoft.com/en-us/cli/azure/ml/online-endpoint?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az ml online-deployment` reference, https://learn.microsoft.com/en-us/cli/azure/ml/online-deployment?view=azure-cli-latest
- Microsoft Learn: CLI v2 managed online deployment YAML schema, https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-deployment-managed-online?view=azureml-api-2
- Microsoft Learn: Deploy MLflow models to online endpoints, https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-mlflow-models-online-endpoints?view=azureml-api-2
- Microsoft Learn: Integrate Azure Stream Analytics with Azure Machine Learning, https://learn.microsoft.com/en-us/azure/stream-analytics/machine-learning-udf
- Microsoft Learn: Outputs from Azure Stream Analytics, https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-define-outputs
- Microsoft Learn: Use query parallelization in Azure Stream Analytics, https://learn.microsoft.com/en-in/azure/stream-analytics/stream-analytics-parallelization
- Microsoft Learn: Azure Service Bus trigger for Azure Functions, https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger
- scikit-learn documentation: `precision_recall_curve`, https://scikit-learn.org/stable/modules/generated/sklearn.metrics.precision_recall_curve.html
- LightGBM documentation: `LGBMClassifier`, https://lightgbm.readthedocs.io/en/latest/pythonapi/lightgbm.LGBMClassifier.html
- MLflow documentation: `mlflow.lightgbm`, https://mlflow.org/docs/latest/python_api/mlflow.lightgbm.html

## Issues Found
- The Event Hubs creation command used the outdated `--message-retention` flag. Updated it to the current `--retention-time 24` option, which is expressed in hours.
- The example event schema did not explain that the Stream Analytics scoring query requires precomputed and enriched feature columns. Added a clarification that the stream must include the same features used during training.
- The `precision_recall_curve` threshold selection indexed `thresholds` with an index from the full `recall` array, even though scikit-learn's final precision and recall values do not have a corresponding threshold. Updated the logic to use `recall[:-1]` and choose the best precision among thresholds that meet at least 95% recall.
- The training code registered `./model` without creating that local MLflow model folder. Added `mlflow.lightgbm.save_model(model, "model")` and registered the model with `--type mlflow_model`.
- The Azure ML online deployment command used unsupported direct `--model`, `--instance-type`, and `--instance-count` flags for the current CLI reference. Replaced it with a managed online deployment YAML file and `az ml online-deployment create --file deployment.yml --all-traffic`.
- Added `--auth-mode key` to the online endpoint creation command so the endpoint has an explicit authentication mode for Stream Analytics function configuration.
- Added a note that Stream Analytics can access Azure ML managed endpoints directly only when public network access is enabled.
- The Stream Analytics SQL reused one `WITH` result across multiple output `SELECT` statements. Updated the example to define the scored stream separately for each output statement.
- Removed an unused `EmailClient` import from the Azure Function example because it was not used and would add an unnecessary package dependency.

## Review Notes
The tutorial is technically relevant and generally sound after the corrections. The example remains a high-level implementation guide; a production system would still need concrete feature enrichment, endpoint authentication secret management, Azure Stream Analytics input/output resource definitions, and load testing to validate the stated latency target for the selected model and SKU.
