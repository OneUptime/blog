# Validation Summary: How to Evaluate Generative AI Models Using Vertex AI Gen AI Evaluation Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI Gen AI Evaluation Service
- Vertex AI SDK for Python
- Gemini models on Vertex AI
- Python and pandas

## Sources Consulted
- Google Cloud: Gen AI evaluation service overview: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview
- Google Cloud: Run an evaluation with the evaluation module in Vertex AI SDK: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/eval-python-sdk/run-evaluation
- Google Cloud: Define your evaluation metrics: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/eval-python-sdk/determine-eval
- Google Cloud: Metric prompt templates for model-based evaluation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/metrics-templates
- Google Cloud Python SDK reference for `vertexai.evaluation`: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.evaluation
- Google Cloud: Gemini model versions and lifecycle: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions

## Issues Found
- The post described "automatic metrics" as being computed by an LLM judge. I changed this to distinguish model-based metrics, which use a judge model, from computation-based metrics such as ROUGE and BLEU.
- The examples used `fulfillment`, which is not a current built-in metric prompt template name in the Vertex AI SDK. I replaced it with the documented `instruction_following` metric.
- The reference-based metrics example printed `rouge_l_sum`, `bleu`, and `fulfillment` columns directly. The SDK stores per-row metric results under columns such as `rouge_l_sum/score`, `bleu/score`, and `instruction_following/score`, so I updated the DataFrame column names.
- The model examples used retired or outdated Gemini model IDs, including `gemini-1.5-flash` and `gemini-2.0-flash`. I updated the examples to use currently documented Gemini 2.5 model aliases.
- The pairwise evaluation example mutated the shared `eval_dataset` by adding `response` and `baseline_model_response` columns. That would conflict with later calls to `evaluate(model=...)`, so I changed it to create a separate `pairwise_dataset`.
- The CI threshold example referenced `fulfillment/mean`. I updated it to `instruction_following/mean` to match the corrected metric.

## Review Notes
The post uses the GA `EvalTask` interface, which remains supported for existing workflows, but Google currently recommends the newer GenAI Client interface for newer evaluation features such as adaptive rubrics. The Python snippets were checked for syntax after edits, but they were not executed against Vertex AI because that requires a configured Google Cloud project, credentials, quota, and network access to the service.
