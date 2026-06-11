# Validation Summary: How to Create Automated Evaluation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- OpenAI Python SDK and Chat Completions API
- LLM-as-judge evaluation
- NLTK BLEU
- ROUGE scoring
- SentenceTransformers embeddings
- GitHub Actions CI/CD
- Slack webhook notifications

## Sources Consulted
- OpenAI API OpenAPI spec for `POST /v1/chat/completions`: https://api.openai.com/v1/chat/completions
- OpenAI structured outputs / JSON mode documentation: https://developers.openai.com/api/docs/guides/structured-outputs
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- GitHub Actions workflow syntax and `GITHUB_TOKEN` permissions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions repository workflow permissions: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository
- `actions/checkout` documentation: https://github.com/actions/checkout
- `actions/setup-python` documentation: https://github.com/actions/setup-python
- NLTK BLEU documentation: https://www.nltk.org/api/nltk.translate.bleu_score.html
- Google `rouge-score` implementation reference: https://github.com/google-research/google-research/tree/master/rouge
- SentenceTransformers pretrained model documentation: https://www.sbert.net/docs/sentence_transformer/pretrained_models.html

## Issues Found
- The comparison table described automated evaluation as fully deterministic and implied uniform 1000+ examples/minute throughput. Updated it to distinguish fast deterministic local metrics from slower, potentially variable LLM judge evaluations.
- The Python snippets used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc).isoformat()` and added `timezone` imports.
- The OpenAI Chat Completions examples used `max_tokens`, which current OpenAI docs mark as deprecated in favor of `max_completion_tokens`. Updated both examples.
- The evaluation pipeline computed per-example ROUGE scores but never aggregated them into `mean_rouge`. Added ROUGE aggregation for `rouge1`, `rouge2`, and `rougeL`.
- The aggregate pipeline assumed non-empty results for overall score and latency statistics. Added guards so empty datasets do not raise `statistics.StatisticsError` or indexing errors.
- The P95 latency index could select an out-of-range or off-by-one percentile position for some list sizes. Added bounded nearest-rank-style indexing.
- The GitHub Actions workflow committed evaluation history and commented on PRs without declaring the needed `GITHUB_TOKEN` permissions. Added `contents: write`, `issues: write`, and `pull-requests: read`.
- The CI YAML section used a four-backtick opening fence because it contains an inner fenced JSON block, but closed with three backticks. Corrected the outer and following Python code fences.

## Review Notes
The examples are tutorial snippets and still assume the reader provides the commented imports, dependencies, API keys, and project-specific generation/evaluation modules. OpenAI's current docs recommend the Responses API for new projects, but Chat Completions remains documented and the examples are technically valid after the parameter updates.
