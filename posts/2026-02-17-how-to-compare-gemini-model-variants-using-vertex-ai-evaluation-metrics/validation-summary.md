# Validation Summary: How to Compare Gemini Model Variants Using Vertex AI Evaluation Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Gemini models
- Vertex AI SDK for Python
- Vertex AI Gen AI evaluation service
- Python
- pandas
- ROUGE and model-based evaluation metrics

## Sources Consulted
- Google Cloud model versions and lifecycle: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions
- Google Cloud Gemini 3 Flash model documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-flash
- Google Cloud Gemini 2.5 Flash model documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash
- Google Cloud Gemini 2.5 Pro model documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro
- Vertex AI SDK evaluation package reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.evaluation
- Vertex AI SDK EvalTask reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.evaluation.EvalTask
- Vertex AI SDK PointwiseMetric reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.evaluation.PointwiseMetric
- Vertex AI SDK PairwiseMetric reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.evaluation.PairwiseMetric
- Vertex AI Gen AI evaluation overview: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview
- Vertex AI metric prompt templates: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/metrics-templates
- Google Cloud generative AI pricing: https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing

## Issues Found
- The post used invalid or outdated model IDs (`gemini-2.0-pro`, `gemini-3.0-flash`, and Gemini 3.0 labels). Updated the examples to use documented current model IDs: `gemini-2.5-flash`, `gemini-2.5-pro`, and `gemini-3-flash-preview`, and adjusted the surrounding text and diagram.
- The initialization location was `us-central1`, but Gemini 3 Flash Preview is documented for the global endpoint. Updated the example to initialize Vertex AI with `location="global"`.
- The evaluation metrics list used bare metric names for model-based metrics, including `fulfillment`, which is not a documented current metric template. Replaced them with `PointwiseMetric` objects using `MetricPromptTemplateExamples.get_prompt_template(...)`, and changed `fulfillment` references to `instruction_following`.
- The pairwise metric constructor used an unsupported `baseline_model_response_column` argument. Removed it and kept the documented bring-your-own-response columns.
- The pairwise result parsing treated pairwise quality as a numeric score. Updated the example to read the documented `pairwise_choice` output and count baseline, candidate, and tie results.
- The task-specific evaluation snippet expected detailed results but the earlier code only retained summaries. Added `all_result_details` and called `evaluate_by_task(...)` with the detailed metrics tables.
- The pricing table contained outdated/incorrect model pricing and a nonexistent `gemini-2.0-pro` entry. Updated the approximate prices to match current standard token pricing for the documented example models.

## Review Notes
The Python snippets were syntax-checked with `python3` AST parsing. The examples were not executed against Vertex AI because that would require a configured Google Cloud project, credentials, billing, and live model quota.
