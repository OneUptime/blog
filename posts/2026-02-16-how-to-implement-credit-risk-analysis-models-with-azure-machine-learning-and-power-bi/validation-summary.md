# Validation Summary: How to Use Credit Risk Analysis Models with Azure Machine Learning and Power BI

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Machine Learning
- Azure ML CLI v2
- Managed online endpoints
- MLflow
- LightGBM
- SHAP
- pandas
- scikit-learn
- imbalanced-learn SMOTE
- Power BI
- DAX
- Azure Stream Analytics
- Azure Event Hubs
- Azure Blob Storage immutable storage

## Sources Consulted
- Azure Machine Learning online endpoint deployment documentation: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-online-endpoints
- Azure ML CLI `az ml online-deployment` reference: https://learn.microsoft.com/en-gb/cli/azure/ml/online-deployment
- Azure Machine Learning MLflow model logging documentation: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-log-mlflow-models
- Azure Machine Learning model monitoring documentation: https://learn.microsoft.com/en-us/azure/machine-learning/concept-model-monitoring
- LightGBM Python API documentation: https://lightgbm.readthedocs.io/en/stable/Python-API.html
- SHAP TreeExplainer documentation: https://shap.readthedocs.io/
- scikit-learn `train_test_split` and `StandardScaler` documentation: https://scikit-learn.org/stable/
- imbalanced-learn SMOTE documentation: https://imbalanced-learn.org/stable/references/generated/imblearn.over_sampling.SMOTE.html
- Power BI real-time streaming documentation: https://learn.microsoft.com/en-us/power-bi/connect-data/service-real-time-streaming
- Azure Blob Storage immutable storage documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview
- CFPB adverse action notice guidance for complex algorithms: https://www.consumerfinance.gov/compliance/circulars/circular-2022-03-adverse-action-notification-requirements-in-connection-with-credit-decisions-based-on-complex-algorithms/

## Issues Found
- The data preparation snippet scaled features and applied SMOTE before the train/test split, which would leak information from the test set into training. I changed the preparation step to save cleaned feature data and moved scaling plus SMOTE into the training script after the split, fitting both only on the training data.
- The LightGBM snippet put `early_stopping_rounds` in the estimator parameter dictionary. Current LightGBM documentation uses the `early_stopping()` callback for early stopping, so I changed the fit call to use `lgb.early_stopping(50)` with `lgb.log_evaluation(50)`.
- The training script registered `./model` later but never created that folder. I added `mlflow.lightgbm.save_model(model, "model")` and marked the Azure ML model registration as `--type mlflow_model`.
- The Azure ML deployment command created a deployment but did not route endpoint traffic to it. I added `--all-traffic`, matching Azure ML CLI documentation.
- The SHAP snippet used `pd` and `np` without importing them, logged `shap_importance.csv` without writing it, and assumed SHAP always returns a list for binary classifiers. I added the missing imports, wrote the artifact file, and added a helper that handles both list and ndarray SHAP return shapes.
- The post stated that two instances "ensure" high availability and that the endpoint returns SHAP factors by default. I softened this to "helps provide" high availability and clarified that SHAP factors are returned only if that logic is included in the scoring path.
- The Power BI section used the older "streaming datasets" terminology and did not mention the announced retirement date for creating new real-time streaming semantic models. I updated the wording to "streaming semantic model" and included the October 31, 2027 retirement caveat from Microsoft documentation.
- The compliance wording implied that SHAP explanations automatically meet adverse action notice requirements. I changed it to say SHAP can help identify factors, but lenders must validate that explanations accurately reflect the credit decision.

## Review Notes
The post is technically relevant and useful as a high-level implementation guide. The snippets are illustrative rather than a full production pipeline; a production credit-risk system would still need stronger treatment of categorical encoding persistence, model calibration, fairness testing, security, audit controls, and a complete scoring script or MLflow pyfunc wrapper for returning both probabilities and explanations.
