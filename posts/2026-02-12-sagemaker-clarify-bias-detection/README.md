# How to Use SageMaker Clarify for Bias Detection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SageMaker, Bias Detection, Fairness, Machine Learning

Description: Detect and measure bias in your machine learning models and datasets using Amazon SageMaker Clarify for responsible and fair AI deployments.

---

A model that's accurate on average can still be unfair to specific groups. Maybe your loan approval model rejects qualified applicants from certain demographics at a higher rate, or your hiring algorithm favors candidates from specific backgrounds. These aren't hypothetical scenarios - they've happened in production at major companies.

SageMaker Clarify helps you detect and measure bias at every stage of the ML lifecycle: in your data before training, in your model after training, and in production after deployment. Let's see how to use it.

## Why Bias Detection Matters

Bias in ML models can come from several sources:

- **Data bias** - Historical data reflects existing societal biases
- **Sampling bias** - Training data doesn't represent the full population
- **Label bias** - Labels were assigned with bias (e.g., biased hiring decisions used as training labels)
- **Algorithmic bias** - The model amplifies existing biases in the data

Clarify doesn't eliminate bias automatically, but it makes it visible and measurable. You can't fix what you can't see.

## Pre-Training Bias Detection

Before you even train a model, check your dataset for bias. Clarify computes several statistical measures that indicate whether certain groups are underrepresented or treated differently.

```python
import sagemaker
from sagemaker import clarify
from sagemaker import Session

session = Session()
role = sagemaker.get_execution_role()
bucket = session.default_bucket()

# Create a Clarify processor
clarify_processor = clarify.SageMakerClarifyProcessor(
    role=role,
    instance_count=1,
    instance_type='ml.m5.xlarge',
    sagemaker_session=session
)

# Define the dataset configuration
data_config = clarify.DataConfig(
    s3_data_input_path=f's3://{bucket}/data/train.csv',
    s3_output_path=f's3://{bucket}/clarify-output/pre-training/',
    label='loan_approved',             # Target column
    headers=[
        'age', 'gender', 'income', 'education',
        'employment_years', 'credit_score', 'loan_amount',
        'loan_approved'
    ],
    dataset_type='text/csv'
)

# Define the sensitive attribute (facet) to analyze
bias_config = clarify.BiasConfig(
    label_values_or_threshold=[1],     # The favorable outcome
    facet_name='gender',                # The sensitive attribute
    facet_values_or_threshold=['F'],    # The group to check for bias against
    group_name='age'                    # Optional: additional group variable
)

# Run pre-training bias analysis
clarify_processor.run_pre_training_bias(
    data_config=data_config,
    data_bias_config=bias_config,
    methods='all',                      # Compute all bias metrics
    wait=True
)

print("Pre-training bias analysis complete!")
```

## Understanding Bias Metrics

Clarify computes several pre-training bias metrics. Here are the most important ones:

- **Class Imbalance (CI)** - Whether the sensitive group is underrepresented in the dataset
- **Difference in Proportions of Labels (DPL)** - Whether positive outcomes are distributed equally across groups
- **KL Divergence** - How different the label distributions are between groups
- **Jensen-Shannon Divergence** - A symmetric version of KL Divergence
- **Conditional Demographic Disparity (CDD)** - Whether outcomes differ after controlling for legitimate factors

Let's read and interpret the results.

```python
import json
import boto3

s3 = boto3.client('s3')

# Read the analysis results
result = s3.get_object(
    Bucket=bucket,
    Key='clarify-output/pre-training/analysis.json'
)
analysis = json.loads(result['Body'].read().decode())

# Parse bias metrics
pre_training_metrics = analysis.get('pre_training_bias_metrics', {})
facets = pre_training_metrics.get('facets', {})

for facet_name, facet_data in facets.items():
    print(f"\nFacet: {facet_name}")
    for metric in facet_data[0].get('metrics', []):
        name = metric['name']
        value = metric['value']
        description = metric.get('description', '')

        # Flag concerning values
        flag = ''
        if name == 'DPL' and abs(value) > 0.1:
            flag = ' [WARNING]'
        elif name == 'CI' and abs(value) > 0.3:
            flag = ' [WARNING]'

        print(f"  {name}: {value:.4f}{flag}")
        if description:
            print(f"    {description}")
```

## Post-Training Bias Detection

After training your model, check whether the model's predictions exhibit bias. Post-training metrics look at how the model treats different groups.

```python
# First, you need a trained model endpoint
model_config = clarify.ModelConfig(
    model_name='loan-approval-model',
    instance_type='ml.m5.xlarge',
    instance_count=1,
    content_type='text/csv',
    accept_type='application/json'
)

# Define how to extract predictions from the model output
model_predicted_label_config = clarify.ModelPredictedLabelConfig(
    probability_threshold=0.5     # Classification threshold
)

# Run post-training bias analysis
clarify_processor.run_post_training_bias(
    data_config=data_config,
    data_bias_config=bias_config,
    model_config=model_config,
    model_predicted_label_config=model_predicted_label_config,
    methods='all',
    wait=True
)

print("Post-training bias analysis complete!")
```

Post-training metrics include:

- **Disparate Impact (DI)** - Ratio of positive predictions for the disadvantaged group vs. the advantaged group. Values far from 1.0 indicate bias.
- **Difference in Positive Proportions in Predicted Labels (DPPL)** - Difference in positive prediction rates
- **Accuracy Difference (AD)** - Whether the model is less accurate for certain groups
- **Treatment Equality (TE)** - Ratio of false positives to false negatives across groups

## SHAP-Based Explainability

Clarify also provides model explainability using SHAP (SHapley Additive exPlanations) values. This shows you which features drive each prediction, which can reveal unexpected biases.

```python
# Configure SHAP analysis
shap_config = clarify.SHAPConfig(
    baseline=[
        [35, 'M', 50000, 'Bachelor', 5, 700, 20000]  # Baseline values
    ],
    num_samples=500,      # Number of samples for SHAP computation
    agg_method='mean_abs' # Aggregation method for global importance
)

# Run explainability analysis
clarify_processor.run_explainability(
    data_config=data_config,
    model_config=model_config,
    explainability_config=shap_config,
    wait=True
)

print("Explainability analysis complete!")
```

Interpret the SHAP results.

```python
# Read explainability results
result = s3.get_object(
    Bucket=bucket,
    Key='clarify-output/pre-training/explanations_shap/out.csv'
)

import pandas as pd
from io import StringIO

shap_df = pd.read_csv(StringIO(result['Body'].read().decode()))

# Show global feature importance
print("Global Feature Importance (SHAP):")
feature_importance = shap_df.abs().mean().sort_values(ascending=False)
for feature, importance in feature_importance.items():
    print(f"  {feature}: {importance:.4f}")
```

## Monitoring Bias in Production

Bias can change over time as the population or data distribution shifts. Use Clarify's monitoring capabilities alongside [SageMaker Model Monitor](https://oneuptime.com/blog/post/2026-02-12-sagemaker-model-monitor-drift-detection/view) to continuously check for bias drift.

```python
from sagemaker.model_monitor import ModelBiasMonitor

# Create a bias monitor
bias_monitor = ModelBiasMonitor(
    role=role,
    instance_count=1,
    instance_type='ml.m5.xlarge',
    volume_size_in_gb=20,
    max_runtime_in_seconds=3600,
    sagemaker_session=session
)

# Create baseline from training data
bias_monitor.suggest_baseline(
    data_config=data_config,
    bias_config=bias_config,
    model_config=model_config,
    model_predicted_label_config=model_predicted_label_config
)

# Schedule regular bias monitoring
from sagemaker.model_monitor import CronExpressionGenerator

bias_monitor.create_monitoring_schedule(
    monitor_schedule_name='loan-model-bias-monitor',
    endpoint_input='loan-approval-endpoint',
    output_s3_uri=f's3://{bucket}/bias-monitoring/',
    ground_truth_input=f's3://{bucket}/ground-truth/',
    schedule_cron_expression=CronExpressionGenerator.daily(),
    analysis_config=bias_config
)
```

## Taking Action on Bias

Finding bias is step one. Here's what to do about it:

**Data-level fixes:**
- Collect more data from underrepresented groups
- Use oversampling or undersampling to balance the dataset
- Remove or redact sensitive attributes (though proxy features may still cause bias)

**Model-level fixes:**
- Add fairness constraints during training
- Use different classification thresholds for different groups
- Try different algorithms that may be less biased

**Process-level fixes:**
- Require bias reports for every model before production deployment
- Set bias metric thresholds that must be met
- Include diverse perspectives in model review

```python
# Example: integrate bias checks into your SageMaker Pipeline
from sagemaker.workflow.conditions import ConditionLessThanOrEqualTo
from sagemaker.workflow.condition_step import ConditionStep

# Only approve the model if disparate impact is within acceptable range
# DI close to 1.0 means equal treatment
bias_condition = ConditionLessThanOrEqualTo(
    left=JsonGet(
        step_name='BiasAnalysis',
        property_file=bias_report,
        json_path='post_training_bias_metrics.facets.gender.metrics.DI'
    ),
    right=0.2  # Maximum allowed deviation from perfect parity
)

bias_gate = ConditionStep(
    name='BiasGateCheck',
    conditions=[bias_condition],
    if_steps=[register_model_step],
    else_steps=[notify_bias_team_step]
)
```

## Reporting and Documentation

Clarify can generate reports suitable for regulatory compliance and internal governance.

```python
# Generate a human-readable bias report
import json

result = s3.get_object(
    Bucket=bucket,
    Key='clarify-output/pre-training/analysis.json'
)
full_report = json.loads(result['Body'].read().decode())

# Extract key findings for stakeholders
print("=" * 60)
print("BIAS ANALYSIS REPORT")
print("=" * 60)
print(f"Dataset: loan applications")
print(f"Protected attribute: gender")
print(f"Favorable outcome: loan approved")
print()

for facet_name, facet_data in full_report['pre_training_bias_metrics']['facets'].items():
    metrics = facet_data[0].get('metrics', [])

    # Highlight key metrics
    dpl = next((m for m in metrics if m['name'] == 'DPL'), None)
    ci = next((m for m in metrics if m['name'] == 'CI'), None)

    if dpl:
        status = 'PASS' if abs(dpl['value']) < 0.1 else 'REVIEW NEEDED'
        print(f"Difference in Proportions: {dpl['value']:.4f} [{status}]")

    if ci:
        status = 'PASS' if abs(ci['value']) < 0.3 else 'REVIEW NEEDED'
        print(f"Class Imbalance: {ci['value']:.4f} [{status}]")
```

## Wrapping Up

Bias detection isn't optional - it's a fundamental part of responsible ML development. SageMaker Clarify makes it practical by integrating bias checks into your existing SageMaker workflow. Run pre-training checks on your data, post-training checks on your model, and continuous monitoring in production. The metrics Clarify provides give you concrete, measurable indicators of fairness that you can track and improve over time. Combine it with [SageMaker Pipelines](https://oneuptime.com/blog/post/2026-02-12-sagemaker-pipelines-mlops/view) to make bias checks a mandatory gate in your deployment process.
