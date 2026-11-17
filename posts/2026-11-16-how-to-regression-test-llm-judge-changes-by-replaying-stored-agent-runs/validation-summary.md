# Validation Summary: How to Regression-Test LLM Judge Changes by Replaying Stored Agent Runs

## Status
validated

## Post Type
Technical guide with a Python integration sketch and an executable metrics fixture.

## Technologies Covered
- LLM judges and agent evaluation
- LangSmith Python SDK and stored experiment traces
- Python standard library: collections.Counter and sum
- Regression testing, human reference labels, classification metrics, and grouped measurements

## Sources Consulted
- OpenAI evaluation best practices: https://developers.openai.com/api/docs/guides/evaluation-best-practices
- OpenAI safety in building agents: https://developers.openai.com/api/docs/guides/agent-builder-safety
- LangSmith existing-experiment evaluation: https://docs.langchain.com/langsmith/evaluate-existing-experiment
- LangSmith experiment comparison: https://docs.langchain.com/langsmith/compare-experiment-results
- LangSmith evaluate API reference: https://reference.langchain.com/python/langsmith/evaluation/_runner/evaluate
- LangSmith official SDK implementation, including evaluate, evaluate_existing, and child-run loading: https://raw.githubusercontent.com/langchain-ai/langsmith-sdk/main/python/langsmith/evaluation/_runner.py
- Python Counter documentation: https://docs.python.org/3/library/collections.html#collections.Counter
- Python sum documentation: https://docs.python.org/3/library/functions.html#sum
- scikit-learn classification metrics and denominators: https://scikit-learn.org/stable/modules/model_evaluation.html#classification-metrics
- scikit-learn held-out evaluation and grouped observations: https://scikit-learn.org/stable/modules/cross_validation.html#cross-validation-iterators-for-grouped-data
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The LangSmith sketch omitted nested-run loading even though the guide covers judges that inspect tool evidence. The SDK defaults to loading only root runs. Added `load_nested=True` and explained that trace-aware evaluators need a `run` argument and must inspect its `child_runs` tree. Verified that `evaluate` forwards this option to `evaluate_existing`. This makes recorded child tool traces available without executing the target again.

## Review Notes
- Parsed both Python code blocks successfully and executed the standalone metrics fixture. The old judge produced 2 correct of 4, 1 false pass, 1 false fail, and 0 unavailable results. The new judge produced 2 correct of 4, 1 false pass, 0 false fails, and 1 unavailable result. Transitions were fail-to-pass twice, pass-to-fail once, and pass-to-error once.
- The LangSmith example is explicitly an integration sketch. It requires the SDK, configured access to an existing experiment, replacement of the experiment placeholder, and application-defined evaluators. No live experiment or judge implementations were supplied, so an authenticated integration run was not performed.
- Confirmed the documented existing-experiment behavior does not rerun the target. Nested loading cannot recover evidence that was never recorded. Distinct feedback keys and an external version manifest are appropriate for interpreting historical scores.
- Reviewed the separation of development and held-out data, human-label isolation, directional error metrics, unavailable-result accounting, representative sampling, repeatability, correlated observations, operating costs, and versioned rollout. No additional technical errors were found. The four-row fixture illustrates accounting rather than providing statistical evidence of a better judge.
- All external links in the post resolved to the intended resources, including the author profile redirect. There are no terminal commands, configuration snippets, or pinned software versions to validate.
- The post cites OpenAI for general evaluation methodology and does not use its Evals API. The documentation's Evals platform deprecation notice therefore does not invalidate the LangSmith implementation shown here.
