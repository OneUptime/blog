# Validation Summary: How to Evaluate Model Fairness with Vertex AI Data Bias and Model Bias Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI model evaluation fairness metrics
- Vertex AI batch prediction
- BigQuery
- Python
- pandas
- scikit-learn
- SQL
- OneUptime monitoring

## Sources Consulted
- Google Cloud Vertex AI: Introduction to model evaluation for fairness: https://docs.cloud.google.com/vertex-ai/docs/evaluation/intro-evaluation-fairness
- Google Cloud Vertex AI: Data bias metrics for Vertex AI: https://docs.cloud.google.com/vertex-ai/docs/evaluation/data-bias-metrics
- Google Cloud Vertex AI: Model bias metrics for Vertex AI: https://docs.cloud.google.com/vertex-ai/docs/evaluation/model-bias-metrics
- Google Cloud Vertex AI: Model evaluation components: https://docs.cloud.google.com/vertex-ai/docs/pipelines/model-evaluation-component
- Google Cloud Vertex AI: Get batch inferences from a custom trained model: https://docs.cloud.google.com/vertex-ai/docs/predictions/get-batch-predictions
- Google Cloud Python API reference: Vertex AI BatchPredictionJob: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.BatchPredictionJob

## Issues Found
- The introduction overstated generic Vertex AI tooling for fairness checks. Updated it to say Vertex AI provides model evaluation pipeline components for data and model bias metrics, and that the guide computes similar metrics from BigQuery data and Vertex AI batch prediction output.
- The pre-training fairness metrics used disparate impact, statistical parity difference, and a custom class imbalance calculation while presenting them as Vertex AI data bias metrics. Replaced them with Vertex AI's documented Difference in Population Size and Difference in Positive Proportions in True Labels (DPPTL) formulas.
- The model fairness code labeled average predicted scores among positive examples as Equal Opportunity / true positive rate. Updated the code to compute thresholded recall difference correctly.
- The model fairness code included predictive parity, which is a standard fairness concept but not one of the documented Vertex AI model bias metrics. Replaced it with specificity difference and Difference in Positive Proportions in Predicted Labels (DPPPL), matching the Vertex AI model bias metric documentation.
- The batch prediction section described the example as using built-in Vertex AI evaluation, but the code only creates batch predictions and then analyzes them manually. Updated the wording to distinguish Vertex AI batch prediction output from Vertex AI model evaluation pipeline components.

## Review Notes
- Vertex AI fairness metric documentation is marked Preview / Pre-GA in Google Cloud docs.
- Google Cloud documentation now notes that Vertex AI services are part of Gemini Enterprise Agent Platform and points to Agent Platform documentation for the most up-to-date information.
