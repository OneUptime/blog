# Validation Summary: How to Build a Golden Evaluation Dataset from Real LLM Production Failures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- LLM and agent evaluation
- Golden, regression, comparison, challenge, and holdout datasets
- JSON evaluation-case records
- Automated graders, LLM-as-a-judge, and human rubric calibration
- Production traces, retrieval context, and replayed tool fixtures
- Dataset privacy, sampling, provenance, and versioning

## Sources Consulted
- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices), especially “How to read evals,” eval-process design, human evals, and LLM-as-a-judge guidance
- [NIST AI RMF Core, including Section 5.3 Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- [NIST AI 600-1: Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- [Anthropic: Challenges in evaluating AI systems](https://www.anthropic.com/news/evaluating-ai-systems)
- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [scikit-learn: Cross-validation iterators for grouped data](https://scikit-learn.org/stable/modules/cross_validation.html#cross-validation-iterators-for-grouped-data)
- [Google for Developers: Datasets—Dividing the original dataset](https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets)

## Issues Found
- The introduction said production failures reveal the real input distribution. A failure corpus is a selected subset of production traffic and can also be biased by reporting and monitoring coverage, so it does not characterize the full distribution. Changed the sentence to say failures expose cases drawn from the real input distribution.
- The dependency-pinning guidance treated stable document IDs as sufficient. A stable identifier can still point to mutable content. Changed it to require document IDs that resolve to immutable versions.
- The reproduction and fix check implied that one run could confirm a failure or fix. LLM behavior can vary between runs. Changed the procedure to use a retained production trace or repeated independent trials, predeclare a trial count and pass-rate threshold for nondeterministic behavior, and apply the same protocol to the proposed version and its counterexample.

## Review Notes
The JSON example is syntactically valid, and all external links resolve to the described resources. The cited OpenAI page currently carries a deprecation notice for the legacy Evals platform, but this post does not depend on that platform or its API; the general evaluation guidance cited here remains applicable. NIST states that AI RMF 1.0 is being revised, while AI RMF 1.0 and NIST AI 600-1 remain the published official sources as of the validation date. The “immutable” never-regress set is coherent when interpreted as frozen within a version; the post already requires reviewed migrations and records additions and removals.
