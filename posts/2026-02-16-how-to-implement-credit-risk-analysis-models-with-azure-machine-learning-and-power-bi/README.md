# How to Use Credit Risk Analysis Models with Azure Machine Learning and Power BI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Machine Learning, Power BI, Credit Risk, Financial Services, Data Science, Risk Analysis, FinTech

Description: Implement credit risk analysis models using Azure Machine Learning for model training and Power BI for interactive risk dashboards.

---

Credit risk analysis is one of the most important applications of machine learning in financial services. Banks and lending institutions need to predict which borrowers are likely to default, and they need to do it accurately while maintaining compliance with regulatory requirements around model explainability.

Azure Machine Learning provides the tools to train, validate, and deploy credit risk models. Power BI turns the model outputs into dashboards that risk analysts and decision-makers can actually use. In this guide, I will walk through building a credit risk pipeline from data preparation to a live dashboard.

## The Credit Risk Analysis Pipeline

```mermaid
graph LR
    A[Loan Application Data] --> B[Azure ML Data Assets]
    B --> C[Feature Engineering]
    C --> D[Model Training]
    D --> E[Model Registry]
    E --> F[Managed Endpoint]
    F --> G[Power BI Dashboard]
    D --> H[Model Explainability]
    H --> G
```

The pipeline starts with historical loan data, flows through feature engineering and model training, gets deployed as a real-time endpoint, and feeds into Power BI for visualization.

## Step 1 - Prepare the Dataset

Credit risk datasets typically include borrower demographics, financial history, loan characteristics, and the outcome (defaulted or not). Before feeding data into a model, you need to handle missing values, encode categorical variables, and balance the dataset since defaults are relatively rare events.

Here is a data preparation script that runs as an Azure ML pipeline step.

```python
import pandas as pd
from sklearn.preprocessing import LabelEncoder
import argparse
import os

def prepare_credit_data(input_path: str, output_path: str):
    """Load raw loan data, clean it, and prepare features for modeling."""
    # Read the raw dataset
    df = pd.read_csv(input_path)

    # Drop rows with critical missing values
    critical_columns = ["annual_income", "loan_amount", "credit_score", "employment_length"]
    df = df.dropna(subset=critical_columns)

    # Fill remaining missing values with median for numeric columns
    numeric_cols = df.select_dtypes(include=["number"]).columns
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())

    # Encode categorical variables
    label_encoders = {}
    categorical_cols = ["home_ownership", "loan_purpose", "employment_type"]
    for col in categorical_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        label_encoders[col] = le

    # Create derived features that are useful for credit risk
    df["debt_to_income"] = df["total_debt"] / (df["annual_income"] + 1)
    df["loan_to_income"] = df["loan_amount"] / (df["annual_income"] + 1)
    df["credit_utilization"] = df["revolving_balance"] / (df["credit_limit"] + 1)

    # Save the cleaned dataset. Scaling and SMOTE should happen after
    # the train/test split so information from the test set does not leak
    # into training.
    os.makedirs(output_path, exist_ok=True)
    df.to_csv(os.path.join(output_path, "prepared_data.csv"), index=False)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=str)
    parser.add_argument("--output", type=str)
    args = parser.parse_args()
    prepare_credit_data(args.input, args.output)
```

The derived features (debt-to-income ratio, loan-to-income ratio, credit utilization) are standard in credit risk modeling. Lenders have used these ratios for decades, and they consistently show up as strong predictors.

## Step 2 - Train the Credit Risk Model

For credit risk, gradient boosting models tend to perform well. They handle non-linear relationships, work with mixed feature types, and produce feature importance scores that help with explainability. Here is a training script using LightGBM within Azure ML.

```python
import lightgbm as lgb
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, classification_report
from imblearn.over_sampling import SMOTE
import mlflow
import mlflow.lightgbm

def train_credit_model(data_path: str):
    """Train a LightGBM credit risk model with MLflow tracking."""
    # Enable MLflow autologging for Azure ML integration
    mlflow.lightgbm.autolog()

    # Load the prepared dataset
    df = pd.read_csv(data_path)
    X = df.drop("default", axis=1)
    y = df["default"]

    # Split into train and test sets before fitting preprocessing steps
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Fit preprocessing only on the training set to avoid data leakage
    scaler = StandardScaler()
    X_train = pd.DataFrame(
        scaler.fit_transform(X_train),
        columns=X.columns,
        index=X_train.index
    )
    X_test = pd.DataFrame(
        scaler.transform(X_test),
        columns=X.columns,
        index=X_test.index
    )

    # Handle class imbalance with SMOTE oversampling on the training set only
    smote = SMOTE(random_state=42)
    X_train, y_train = smote.fit_resample(X_train, y_train)

    # Configure LightGBM parameters tuned for credit risk
    params = {
        "objective": "binary",
        "metric": "auc",
        "boosting_type": "gbdt",
        "num_leaves": 31,
        "learning_rate": 0.05,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 5,
        "verbose": -1,
        "n_estimators": 500
    }

    # Train the model
    model = lgb.LGBMClassifier(**params)
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        callbacks=[
            lgb.early_stopping(50),
            lgb.log_evaluation(50)
        ]
    )

    # Evaluate on the test set
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    auc_score = roc_auc_score(y_test, y_pred_proba)

    # Log metrics to MLflow
    mlflow.log_metric("test_auc", auc_score)
    mlflow.log_metric("num_features", X_train.shape[1])

    # Log feature importance
    importance_df = pd.DataFrame({
        "feature": X.columns,
        "importance": model.feature_importances_
    }).sort_values("importance", ascending=False)
    importance_df.to_csv("feature_importance.csv", index=False)
    mlflow.log_artifact("feature_importance.csv")
    mlflow.lightgbm.save_model(model, "model")

    print(f"Test AUC: {auc_score:.4f}")
    print(classification_report(y_test, (y_pred_proba > 0.5).astype(int)))

    return model

if __name__ == "__main__":
    train_credit_model("prepared_data.csv")
```

MLflow integration with Azure ML is important here. Every training run logs parameters, metrics, and artifacts automatically. When regulators ask about model performance or how hyperparameters were chosen, you have a complete history.

## Step 3 - Add Model Explainability

Financial regulators increasingly require that credit risk models are explainable. You cannot just say "the model said no" when denying a loan. You need to explain which factors drove the decision.

```python
import shap
import mlflow
import numpy as np
import pandas as pd

def get_positive_class_shap_values(shap_values):
    """Return SHAP values for the positive class across SHAP versions."""
    if isinstance(shap_values, list):
        return shap_values[1]
    if getattr(shap_values, "ndim", 0) == 3:
        return shap_values[:, :, 1]
    return shap_values

def explain_model(model, X_test, feature_names):
    """Generate SHAP explanations for the credit risk model."""
    # Create a SHAP TreeExplainer for the LightGBM model
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_test)

    # Get global feature importance from SHAP
    positive_class_shap = get_positive_class_shap_values(shap_values)
    global_importance = pd.DataFrame({
        "feature": feature_names,
        "mean_shap": np.abs(positive_class_shap).mean(axis=0)
    }).sort_values("mean_shap", ascending=False)

    # Log the SHAP summary to MLflow
    global_importance.to_csv("shap_importance.csv", index=False)
    mlflow.log_artifact("shap_importance.csv")

    # For individual predictions, show top contributing factors
    return explainer, shap_values

def explain_single_prediction(model, explainer, applicant_data, feature_names):
    """Explain why a specific loan application was scored the way it was."""
    shap_values = explainer.shap_values(applicant_data)
    positive_class_shap = get_positive_class_shap_values(shap_values)
    contributions = pd.DataFrame({
        "feature": feature_names,
        "value": applicant_data.values[0],
        "contribution": positive_class_shap[0]
    }).sort_values("contribution", key=lambda values: values.abs(), ascending=False)

    # Top 5 reasons for the decision
    return contributions.head(5)
```

SHAP values are particularly useful because they give you per-applicant explanations. If an applicant is denied, they can help identify statements such as "the primary factors were high debt-to-income ratio and short employment history," but lenders still need to validate that those explanations accurately reflect the factors used in the credit decision for adverse action notices.

## Step 4 - Deploy as a Real-Time Endpoint

Once the model is trained and validated, deploy it as a managed online endpoint in Azure ML. This gives you a REST API that your loan origination system can call in real time.

```bash
# Register the model in Azure ML

az ml model create \
  --name credit-risk-model \
  --version 1 \
  --path ./model \
  --type mlflow_model \
  --resource-group finance-ml-rg \
  --workspace-name finance-ml-ws

# Create a managed online endpoint
az ml online-endpoint create \
  --name credit-risk-endpoint \
  --resource-group finance-ml-rg \
  --workspace-name finance-ml-ws

# Deploy the model to the endpoint
az ml online-deployment create \
  --name credit-risk-v1 \
  --endpoint-name credit-risk-endpoint \
  --model azureml:credit-risk-model:1 \
  --instance-type Standard_DS3_v2 \
  --instance-count 2 \
  --all-traffic \
  --resource-group finance-ml-rg \
  --workspace-name finance-ml-ws
```

Running two instances helps provide high availability. If you include the SHAP logic in the scoring path, the scoring endpoint can return both the probability of default and the top contributing factors from the SHAP analysis.

## Step 5 - Build the Power BI Dashboard

With the model deployed, connect Power BI to the scoring results stored in Cosmos DB or a SQL database. The dashboard should show several views that risk analysts care about.

Key visuals to include:

- **Portfolio risk distribution**: A histogram showing the distribution of predicted default probabilities across your loan portfolio.
- **Risk segmentation**: A matrix showing default rates by loan grade, purpose, and term.
- **Feature importance chart**: A bar chart showing which features have the most impact on predictions globally.
- **Trend analysis**: A line chart showing how average predicted risk has changed over time.
- **Individual loan drill-down**: A detail page showing the SHAP explanation for a specific loan.

In Power BI, create a DAX measure to bucket loans into risk categories.

```text
Risk Category =
SWITCH(
    TRUE(),
    [Default Probability] <= 0.1, "Low Risk",
    [Default Probability] <= 0.3, "Medium Risk",
    [Default Probability] <= 0.5, "High Risk",
    "Very High Risk"
)
```

Set up a scheduled refresh so the dashboard pulls the latest scoring results daily. For real-time monitoring, use a Power BI streaming semantic model, or use Azure Stream Analytics with Event Hub as the input and Power BI as the output. Microsoft has announced that creation of new Power BI real-time streaming semantic models remains enabled until October 31, 2027, so plan new real-time implementations with that retirement date in mind.

## Model Governance and Monitoring

Credit risk models degrade over time as economic conditions change. Set up model monitoring in Azure ML to track data drift and prediction drift.

Create a monitoring schedule that compares the incoming data distribution to the training data. When features drift beyond a threshold, trigger a retraining pipeline. This is not optional for financial services - regulators expect you to demonstrate ongoing model performance monitoring.

Log every prediction with its inputs and outputs. This creates an audit trail that shows exactly what data went into each lending decision. Store these logs in a tamper-proof manner, such as Azure immutable blob storage.

## Wrapping Up

Credit risk modeling with Azure ML and Power BI gives you the full pipeline from data to decisions. Azure ML handles the heavy lifting of training, explainability, and deployment. Power BI turns the results into actionable dashboards for risk teams. The combination of validated SHAP explanations and MLflow tracking supports regulatory requirements for model transparency. Start with a solid feature engineering pipeline, validate your model thoroughly, and build monitoring into the process from day one.
