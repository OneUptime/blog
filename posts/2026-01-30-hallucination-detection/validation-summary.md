# Validation Summary: How to Create Hallucination Detection

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- Python
- OpenAI Chat Completions API and JSON mode
- Retrieval-Augmented Generation grounding checks
- Natural Language Inference with Hugging Face Transformers
- PyTorch inference utilities
- Sentence Transformers embeddings
- OpenTelemetry Python tracing and metrics
- Python asyncio background execution
- pytest

## Sources Consulted
- OpenAI Structured Outputs and JSON mode documentation: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI Chat Completions API reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- Hugging Face model card for `microsoft/deberta-large-mnli`: https://huggingface.co/microsoft/deberta-large-mnli
- Hugging Face model card for `microsoft/deberta-v3-large`: https://huggingface.co/microsoft/deberta-v3-large
- Hugging Face Transformers sequence classification documentation: https://huggingface.co/docs/transformers/en/tasks/sequence_classification
- Sentence Transformers `SentenceTransformer.encode` documentation: https://www.sbert.net/docs/package_reference/sentence_transformer/model.html
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- Python `asyncio` event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Related OneUptime blog links were checked and returned HTTP 200.

## Issues Found
- The OpenAI JSON-mode claim extraction prompts asked the model to return a JSON array while the code enabled `response_format={"type": "json_object"}` and then parsed a `claims` property. Updated both prompts to request a JSON object with a `claims` array.
- The self-consistency example imported `hashlib`, which was unused, but omitted the required `openai` and `json` imports. Replaced the unused import with the required imports.
- The OpenAI examples used the older `gpt-4` default model string. Updated the examples to `gpt-4o`, which is a current Chat Completions-compatible model and supports JSON mode.
- The NLI example used `microsoft/deberta-v3-large-mnli`, which is not a Microsoft Hugging Face model ID. Changed it to `microsoft/deberta-large-mnli`, which is an official MNLI fine-tuned model.
- The NLI example assumed a hard-coded label order. Updated it to read `self.model.config.id2label` so the code follows the loaded model's configured label mapping.
- The semantic-similarity detector returned a perfect score when context was empty. Updated it to return a zero score and flag response chunks when there is response text but no context to compare against.
- The async monitor used `asyncio.get_event_loop()` inside a coroutine. Updated it to `asyncio.get_running_loop()`, which is the current direct API for retrieving the active loop in coroutine code.
- The async monitor compared severity enum string values lexicographically, which misorders values such as `critical` and `high`. Added explicit severity ranking for threshold comparisons.
- The async monitor used deprecated `datetime.utcnow()`. Updated it to `datetime.now(UTC)` and added the required imports.
- The async monitor referenced undefined `logger`, `alerting_service`, and `_log_error`. Added a module logger, passed an optional alerting service into the monitor, and added `_log_error()`.

## Review Notes
All Python fenced code blocks were parsed with Python 3.12 after the edits. The examples remain illustrative and still depend on surrounding application code or services such as `generate_llm_response`, installed model dependencies, OpenAI credentials, and a configured OpenTelemetry exporter.
