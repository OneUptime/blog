# How to Measure LLM Output Variance at Temperature Zero

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Statistical Analysis, Python

Description: Measure exact-text and semantic variability at temperature zero with frozen request envelopes, fresh repetitions, and separate judge repeatability checks.

Setting temperature to zero does not create a service-level promise of identical answers. A request may still differ in hidden application context, retrieval results, tool execution, provider configuration, or supported decoding behavior. The useful question is how often the same controlled request changes, and whether those changes matter to the application.

Do not begin by asserting a particular hardware cause. First establish that the requests and grading conditions are actually comparable. Otherwise the experiment measures changing inputs rather than output variability.

## Freeze the complete request envelope

Save the rendered messages, tool schemas, tool choice configuration, output format, generation limits, model identifier, endpoint, and any model-specific settings. Record the SDK and application version. A prompt template hash alone misses timestamps, randomized examples, retrieved ordering, and conversational history inserted at runtime.

Where a supported API exposes a seed or backend fingerprint, record it. OpenAI's Chat Completions documentation describes seeded outputs as mostly deterministic and notes that configuration changes can affect results. This does not imply that every model or endpoint supports the same controls. Check the selected model and API contract before adding temperature or seed parameters.

Separate an endpoint experiment from a workflow experiment. For the endpoint experiment, freeze retrieved context and tool results. For the workflow experiment, preserve the initial state and record how later inputs evolve. Both are useful, but only the first isolates repeated generation over the same supplied evidence.

## Ensure every repetition is fresh

Disable application and test-harness response replay while keeping deliberately fixed dependency fixtures. A cache returning one saved answer will falsely suggest perfect repeatability. Conversely, changing the prompt by adding a unique nonce tests a different request, so it is not a clean solution for measuring identical-input behavior.

Run repetitions in a controlled sequence and record timestamps, concurrency, retries, errors, returned model metadata, and termination status. Try a separate concurrency experiment after establishing a low-concurrency baseline. Do not mix the two workloads in one variance estimate.

Keep the number of attempts fixed in advance. Stopping as soon as a difference appears estimates something different from running a planned sample. For expensive tests, use a pilot to choose an affordable repetition budget and report that budget.

## Measure both text changes and decision changes

Exact output hashes answer whether bytes changed. Semantic labels answer whether behavior changed. For an extraction task, compare the extracted fields; for a classification task, compare the selected class; for an agent, compare authorized actions and outcomes.

This offline Python fixture computes the modal share and disagreement among all unordered pairs of observed outcomes:

```python
from collections import Counter
from math import comb

def stability(values):
    n = len(values)
    if n < 2:
        raise ValueError("at least two observations are required")
    counts = Counter(values)
    equal_pairs = sum(comb(count, 2) for count in counts.values())
    return {
        "observations": n,
        "distinct": len(counts),
        "modal_share": max(counts.values()) / n,
        "pair_disagreement": 1 - equal_pairs / comb(n, 2),
    }

texts = ["Approved.", "Approved.", "Approval granted.", "Denied."]
labels = ["approve", "approve", "approve", "deny"]
print(stability(texts))
print(stability(labels))
assert stability(labels)["pair_disagreement"] == 0.5
```

For the semantic labels, three of six unordered pairs disagree. The many pair comparisons are not independent samples; do not use their count as the sample size for a confidence interval. The independent experimental units remain the requests or the clusters that generated them.

Report refusals, truncations, and transport errors separately from successful semantic labels. Also report an end-to-end outcome measure that accounts for them. Excluding errors without showing their frequency can make an unstable service look consistent.

## Isolate evaluator variability

If a model judge assigns the semantic labels, store the generated answers first. Then grade each unchanged answer several times with a fixed rubric. That separates generation variability from judge variability. A judge that alternates between pass and fail can make a stable application appear noisy.

LangSmith repetitions rerun both the target and evaluators. That is suitable for measuring the whole evaluation pipeline, but it does not by itself isolate the two components. Use an existing-output scoring pass or a dedicated frozen-answer function for the judge-only experiment.

For numeric outputs, examine per-case means, ranges, and dispersion in units that matter to the task. For categories, inspect frequency tables and consequential transitions. A tiny wording change and an opposite authorization decision should not have the same operational weight.

## Turn observations into a decision

Repeat the experiment across representative cases, including ambiguous and boundary inputs. Summarize per case before aggregating so one heavily repeated easy prompt does not dominate the result. Preserve conversation clusters when estimating uncertainty.

If variation is mostly harmless phrasing, avoid brittle snapshot tests. If it changes required facts or tool actions, tighten deterministic constraints, improve evidence, or route uncertain cases for review. A fixed seed can help debugging where supported, but release confidence comes from observed behavior under the actual operating conditions, not from assuming temperature zero removes uncertainty.

## Official documentation

- [OpenAI: Reproducible Chat Completions outputs](https://developers.openai.com/api/docs/guides/advanced-usage#reproducible-outputs)
- [LangSmith: Experiment configuration](https://docs.langchain.com/langsmith/experiment-configuration)
- [LangSmith: Evaluate with repetitions](https://docs.langchain.com/langsmith/repetition)
