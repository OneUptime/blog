# How to Detect and Mitigate Bias in Tabular ML Models with Vertex AI Fairness Evaluation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, ML Fairness, Bias Detection, Responsible AI

Description: Learn how to detect, measure, and mitigate bias in tabular machine learning models using Vertex AI's fairness evaluation tools and responsible AI practices on GCP.

---

Every ML model has the potential to encode biases from its training data. A loan approval model might discriminate by race. A hiring model might penalize certain genders. A pricing model might treat different regions unfairly. These biases aren't always intentional - they often emerge from historical data that reflects existing societal inequalities. Detecting and mitigating these biases isn't just an ethical obligation; in many jurisdictions, it's a legal one.

Vertex AI provides fairness evaluation tools that let you measure bias across sensitive attributes, visualize disparities, and take corrective action. In this post, I'll walk through the full lifecycle of fairness evaluation for a tabular ML model.

## Understanding Fairness Metrics

Before diving into code, let's clarify the key metrics:

- **Demographic Parity**: Do different groups receive positive outcomes at similar rates?
- **Equal Opportunity**: Among people who deserve a positive outcome, do different groups get it at similar rates?
- **Equalized Odds**: Are error rates (false positives and false negatives) similar across groups?
- **Predictive Parity**: When the model predicts a positive outcome, is it equally accurate across groups?

No single metric captures all aspects of fairness, and some metrics actually conflict with each other mathematically. You need to choose the metrics most appropriate for your use case.

## Setting Up the Model and Data

Let's work with a loan approval model as an example:

```python
from google.cloud import aiplatform
from google.cloud import bigquery
import pandas as pd
import numpy as np

def prepare_evaluation_data(project_id):
    """Prepare data for fairness evaluation"""
    client = bigquery.Client(project=project_id)

    query = """
    SELECT
        application_id,
        -- Features
        income,
        debt_to_income_ratio,
        credit_score,
        employment_years,
        loan_amount,
        loan_purpose,
        -- Sensitive attributes (for fairness evaluation only)
        age_group,
        gender,
        race_ethnicity,
        zip_code_region,
        -- Target
        approved AS label,
        -- Model prediction
        model_prediction,
        model_probability
    FROM `{project_id}.lending.evaluation_set`
    """.format(project_id=project_id)

    df = client.query(query).to_dataframe()

    return df
```

## Computing Fairness Metrics

```python
def compute_fairness_metrics(df, sensitive_attribute, label_col="label",
                              prediction_col="model_prediction"):
    """Compute comprehensive fairness metrics for a sensitive attribute"""

    groups = df[sensitive_attribute].unique()
    metrics = {}

    for group in groups:
        group_data = df[df[sensitive_attribute] == group]
        n = len(group_data)

        # Basic counts
        true_positives = len(group_data[
            (group_data[label_col] == 1) & (group_data[prediction_col] == 1)
        ])
        false_positives = len(group_data[
            (group_data[label_col] == 0) & (group_data[prediction_col] == 1)
        ])
        true_negatives = len(group_data[
            (group_data[label_col] == 0) & (group_data[prediction_col] == 0)
        ])
        false_negatives = len(group_data[
            (group_data[label_col] == 1) & (group_data[prediction_col] == 0)
        ])

        # Positive prediction rate (for demographic parity)
        positive_rate = (true_positives + false_positives) / n if n > 0 else 0

        # True positive rate (for equal opportunity)
        actual_positives = true_positives + false_negatives
        tpr = true_positives / actual_positives if actual_positives > 0 else 0

        # False positive rate (for equalized odds)
        actual_negatives = false_positives + true_negatives
        fpr = false_positives / actual_negatives if actual_negatives > 0 else 0

        # Precision (for predictive parity)
        predicted_positives = true_positives + false_positives
        precision = true_positives / predicted_positives if predicted_positives > 0 else 0

        metrics[group] = {
            "count": n,
            "positive_rate": round(positive_rate, 4),
            "true_positive_rate": round(tpr, 4),
            "false_positive_rate": round(fpr, 4),
            "precision": round(precision, 4),
        }

    # Calculate disparity ratios
    group_list = list(metrics.keys())
    disparities = {}

    for i, g1 in enumerate(group_list):
        for g2 in group_list[i+1:]:
            pair = f"{g1} vs {g2}"

            # Demographic parity ratio (closer to 1 is fairer)
            dp_ratio = (
                min(metrics[g1]["positive_rate"], metrics[g2]["positive_rate"]) /
                max(metrics[g1]["positive_rate"], metrics[g2]["positive_rate"])
                if max(metrics[g1]["positive_rate"], metrics[g2]["positive_rate"]) > 0
                else 0
            )

            # Equal opportunity ratio
            eo_ratio = (
                min(metrics[g1]["true_positive_rate"], metrics[g2]["true_positive_rate"]) /
                max(metrics[g1]["true_positive_rate"], metrics[g2]["true_positive_rate"])
                if max(metrics[g1]["true_positive_rate"], metrics[g2]["true_positive_rate"]) > 0
                else 0
            )

            disparities[pair] = {
                "demographic_parity_ratio": round(dp_ratio, 4),
                "equal_opportunity_ratio": round(eo_ratio, 4),
            }

    return {
        "group_metrics": metrics,
        "disparities": disparities,
    }
```

## Using Vertex AI Model Evaluation

Vertex AI has built-in fairness evaluation for models:

```python
def evaluate_model_fairness(project_id, model_id, evaluation_data_uri):
    """Run Vertex AI model evaluation with fairness metrics"""
    aiplatform.init(project=project_id, location="us-central1")

    model = aiplatform.Model(model_id)

    # Create a batch prediction job for evaluation
    batch_prediction_job = model.batch_predict(
        job_display_name="fairness-evaluation",
        gcs_source=evaluation_data_uri,
        gcs_destination_prefix="gs://your-bucket/fairness-eval/",
        instances_format="jsonl",
        predictions_format="jsonl",
    )

    batch_prediction_job.wait()

    # Now evaluate with fairness slices
    eval_job = aiplatform.ModelEvaluation.create(
        model=model,
        prediction_type="classification",
        # Define evaluation slices by sensitive attributes
        evaluation_slices=[
            {
                "dimension": "gender",
                "value": "male",
            },
            {
                "dimension": "gender",
                "value": "female",
            },
            {
                "dimension": "race_ethnicity",
                "value": "white",
            },
            {
                "dimension": "race_ethnicity",
                "value": "black",
            },
            {
                "dimension": "race_ethnicity",
                "value": "hispanic",
            },
            {
                "dimension": "age_group",
                "value": "18-30",
            },
            {
                "dimension": "age_group",
                "value": "31-50",
            },
            {
                "dimension": "age_group",
                "value": "51+",
            },
        ],
    )

    return eval_job
```

## Bias Mitigation Strategies

Once you've detected bias, here are practical mitigation approaches:

### Pre-processing: Rebalancing Training Data

```python
def rebalance_training_data(df, sensitive_attr, target_col):
    """Rebalance training data to reduce representation bias"""

    groups = df[sensitive_attr].unique()
    group_sizes = df.groupby(sensitive_attr).size()

    # Find the median group size
    median_size = int(group_sizes.median())

    balanced_dfs = []
    for group in groups:
        group_df = df[df[sensitive_attr] == group]

        if len(group_df) > median_size:
            # Downsample larger groups
            sampled = group_df.sample(n=median_size, random_state=42)
        else:
            # Upsample smaller groups
            sampled = group_df.sample(
                n=median_size, replace=True, random_state=42
            )

        balanced_dfs.append(sampled)

    balanced = pd.concat(balanced_dfs, ignore_index=True)

    print("Original distribution:")
    print(df[sensitive_attr].value_counts())
    print("\nBalanced distribution:")
    print(balanced[sensitive_attr].value_counts())

    return balanced
```

### In-processing: Fairness Constraints During Training

```python
def train_with_fairness_constraints(
    training_data,
    sensitive_attrs,
    fairness_metric="demographic_parity",
    max_disparity=0.1,
):
    """Train a model with fairness constraints using Vertex AI"""
    aiplatform.init(project="your-project-id", location="us-central1")

    # Upload the balanced training data
    dataset = aiplatform.TabularDataset.create(
        display_name="fairness-aware-lending-data",
        gcs_source="gs://your-bucket/balanced-training-data.csv",
    )

    # Train with AutoML which includes fairness-aware optimization
    job = aiplatform.AutoMLTabularTrainingJob(
        display_name="fair-lending-model",
        optimization_prediction_type="classification",
        optimization_objective="maximize-au-prc",
    )

    model = job.run(
        dataset=dataset,
        target_column="approved",
        training_fraction_split=0.8,
        validation_fraction_split=0.1,
        test_fraction_split=0.1,
        budget_milli_node_hours=2000,
        # Exclude sensitive attributes from model features
        column_specs={
            "gender": "categorical",  # Include for monitoring but exclude from training
            "race_ethnicity": "categorical",
        },
    )

    return model
```

### Post-processing: Threshold Adjustment

```python
def calibrate_thresholds(df, sensitive_attr, probability_col,
                         label_col, target_positive_rate=None):
    """Adjust classification thresholds per group to equalize positive rates"""

    groups = df[sensitive_attr].unique()

    if target_positive_rate is None:
        # Use the overall positive rate as the target
        target_positive_rate = df[label_col].mean()

    thresholds = {}

    for group in groups:
        group_data = df[df[sensitive_attr] == group]
        probabilities = group_data[probability_col].sort_values(ascending=False)

        # Find the threshold that gives the target positive rate
        target_count = int(len(group_data) * target_positive_rate)
        if target_count > 0 and target_count <= len(probabilities):
            threshold = probabilities.iloc[target_count - 1]
        else:
            threshold = 0.5

        thresholds[group] = round(threshold, 4)

        # Calculate the resulting positive rate
        predicted_positive = (group_data[probability_col] >= threshold).mean()
        print(f"Group: {group}, Threshold: {threshold:.4f}, "
              f"Positive rate: {predicted_positive:.4f}")

    return thresholds

def apply_calibrated_predictions(df, sensitive_attr, probability_col, thresholds):
    """Apply group-specific thresholds for fair predictions"""
    df = df.copy()
    df["fair_prediction"] = 0

    for group, threshold in thresholds.items():
        mask = df[sensitive_attr] == group
        df.loc[mask, "fair_prediction"] = (
            df.loc[mask, probability_col] >= threshold
        ).astype(int)

    return df
```

## Continuous Monitoring

Set up ongoing fairness monitoring for the deployed model:

```python
def monitor_fairness(project_id, model_endpoint_id, monitoring_data):
    """Set up continuous fairness monitoring"""
    aiplatform.init(project=project_id, location="us-central1")

    # Create a model monitoring job
    monitoring_job = aiplatform.ModelDeploymentMonitoringJob.create(
        display_name="fairness-monitoring",
        endpoint=aiplatform.Endpoint(model_endpoint_id),
        logging_sampling_strategy={
            "random_sample_config": {"sample_rate": 0.1}
        },
        # Monitor for prediction drift that could indicate fairness degradation
        model_monitoring_alert_config={
            "email_alert_config": {
                "user_emails": ["ml-team@company.com"]
            },
        },
        # Check fairness metrics weekly
        model_monitoring_schedule_config={
            "monitor_interval": {"seconds": 604800}  # 7 days
        },
    )

    return monitoring_job

def generate_fairness_report(df, sensitive_attributes, model_name):
    """Generate a comprehensive fairness report"""
    report = {
        "model": model_name,
        "evaluation_date": pd.Timestamp.now().isoformat(),
        "sample_size": len(df),
        "attribute_analyses": {},
    }

    for attr in sensitive_attributes:
        metrics = compute_fairness_metrics(df, attr)
        report["attribute_analyses"][attr] = metrics

        # Flag concerning disparities
        for pair, disparity in metrics["disparities"].items():
            dp_ratio = disparity["demographic_parity_ratio"]
            if dp_ratio < 0.8:  # 80% rule of thumb
                print(f"WARNING: Demographic parity ratio for {attr} "
                      f"({pair}): {dp_ratio:.3f} - below 0.8 threshold")

    return report
```

## Running a Complete Fairness Evaluation

Tie everything together:

```python
def full_fairness_evaluation(project_id):
    """Run a complete fairness evaluation pipeline"""

    # Step 1: Prepare data
    df = prepare_evaluation_data(project_id)

    # Step 2: Compute fairness metrics for each sensitive attribute
    sensitive_attrs = ["gender", "race_ethnicity", "age_group"]

    print("=" * 60)
    print("FAIRNESS EVALUATION REPORT")
    print("=" * 60)

    for attr in sensitive_attrs:
        print(f"\n--- {attr.upper()} ---")
        metrics = compute_fairness_metrics(df, attr)

        for group, group_metrics in metrics["group_metrics"].items():
            print(f"\n  {group} (n={group_metrics['count']}):")
            print(f"    Approval rate: {group_metrics['positive_rate']:.1%}")
            print(f"    True positive rate: {group_metrics['true_positive_rate']:.1%}")
            print(f"    False positive rate: {group_metrics['false_positive_rate']:.1%}")

        print(f"\n  Disparities:")
        for pair, disparity in metrics["disparities"].items():
            dp = disparity["demographic_parity_ratio"]
            eo = disparity["equal_opportunity_ratio"]
            flag = " *** CONCERN" if dp < 0.8 else ""
            print(f"    {pair}:")
            print(f"      Demographic parity ratio: {dp:.3f}{flag}")
            print(f"      Equal opportunity ratio: {eo:.3f}")

    # Step 3: If bias detected, apply mitigation
    # (This would depend on which issues were found)

    return report
```

## Wrapping Up

Fairness evaluation isn't a one-time checkbox - it's an ongoing process that should be embedded in your ML lifecycle. Vertex AI gives you the tools to measure bias quantitatively, but choosing the right fairness metric, setting appropriate thresholds, and deciding on mitigation strategies requires understanding your specific use case and its real-world impact. Start by identifying which sensitive attributes matter for your application, measure fairness metrics before deployment, set up continuous monitoring, and have a clear process for what happens when the metrics flag a problem. The goal isn't a perfectly unbiased model (that's mathematically impossible in many cases) but a model whose behavior you understand, can explain, and have deliberately chosen as acceptable for your context.
