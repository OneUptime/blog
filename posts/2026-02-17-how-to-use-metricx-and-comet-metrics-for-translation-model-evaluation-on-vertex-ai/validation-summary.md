# Validation Summary: How to Use MetricX and COMET Metrics for Translation Model Evaluation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI SDK for Python
- Vertex AI Gen AI evaluation service
- MetricX
- COMET
- BLEU
- ROUGE
- Gemini models
- Python
- pandas

## Sources Consulted
- Vertex AI SDK evaluation module reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.evaluation
- Vertex AI EvalTask reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.evaluation.EvalTask
- Vertex AI evaluation run guide, including translation metric examples: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/eval-python-sdk/run-evaluation
- Vertex AI Gen AI evaluation service API reference for COMET and MetricX inputs, outputs, and score ranges: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/evaluation
- Vertex AI Gemini model versions and lifecycle: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Google Cloud Python Vertex AI SDK source for `pointwise_metric.Comet` and `pointwise_metric.MetricX`: https://github.com/googleapis/python-aiplatform/blob/main/vertexai/evaluation/metrics/pointwise_metric.py

## Issues Found
- The post used `"metricx"` and `"comet"` as string metric names. Vertex AI's documented translation evaluation example uses `pointwise_metric.MetricX()` and `pointwise_metric.Comet()` metric objects, so the code examples were updated and the required import was added.
- The post read per-example metric columns as `metricx`, `comet`, `bleu`, and `rouge_l_sum`. Vertex AI result tables expose metric scores with `/score` suffixes, so the examples were changed to use `metricx/score`, `comet/score`, `bleu/score`, and `rouge_l_sum/score`.
- The MetricX explanation omitted Vertex AI's documented 0 to 25 score range. It now states that 0 represents a perfect translation on that scale.
- The production pipeline accepted missing references while still running COMET. Vertex AI's COMET metric requires source, prediction, and reference, so the example now raises a clear error when references are missing and the continuous evaluation example supplies reference translations.
- The MetricX threshold default was `0.5`, which was inconsistent with Vertex AI's documented 0 to 25 MetricX score range. It was changed to `5.0`.
- The model comparison used `gemini-2.0-pro`, which is not listed as a current stable Vertex AI model ID. The example now uses `gemini-2.5-pro` and `gemini-2.5-flash`.

## Review Notes
The Vertex AI translation evaluation feature is documented as preview. The examples are syntactically valid Python, but they require `google-cloud-aiplatform[evaluation]`, Google Cloud authentication, a project with Vertex AI enabled, and access to the referenced Gemini models.
