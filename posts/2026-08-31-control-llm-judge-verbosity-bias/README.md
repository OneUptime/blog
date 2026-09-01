# Why Do LLM Judges Prefer Longer Answers? Testing and Controlling Verbosity Bias

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Evaluation, Testing, Prompt Engineering, Statistical Analysis

Description: Test whether an LLM judge rewards length instead of quality and control the bias with matched pairs, atomic rubrics, and slice-level calibration.

---

A longer answer has more chances to mention rubric keywords, look comprehensive, and provide a persuasive rationale. It also has more chances to repeat itself, introduce unsupported claims, or bury the answer. Yet an LLM judge may mistake surface detail for quality. OpenAI’s official evaluation guidance identifies verbosity bias as a known judge failure and recommends controlling response length.

The goal is not to make every answer short. It is to ensure length affects the verdict only when the product criterion makes it relevant.

## Prove the Bias with Matched Pairs

A correlation between token count and score is not enough: difficult questions may require both longer and better answers. Construct controlled transformations of the same underlying response.

Useful pairs include:

1. **Repetition:** add a paragraph that restates existing facts without new information.
2. **Harmless padding:** add generic framing and a summary while preserving all claims.
3. **Concise edit:** remove redundancy without removing required evidence.
4. **Distractor detail:** add correct but irrelevant facts.
5. **Unsupported detail:** add one plausible claim not supported by the provided source.
6. **Quality crossover:** compare a concise correct answer with a long answer containing a material error.

Have experts verify that the transformation preserves or deliberately changes the target quality. Run each pair in both A/B orders. A verbosity-biased judge will prefer padded versions when humans see a tie, or choose a longer but worse answer in the crossover test.

```python
def preference_by_length(rows):
    eligible = [r for r in rows if r["human_label"] == "tie"]
    longer_wins = sum(r["judge_winner"] == r["longer_id"] for r in eligible)
    shorter_wins = sum(r["judge_winner"] == r["shorter_id"] for r in eligible)
    return longer_wins, shorter_wins, len(eligible)
```

Report ties and inconsistent swapped-order decisions, not just the proportion of decisive longer wins.

## Make the Rubric Atomic

A compound request such as “score correctness, relevance, completeness, clarity, and professionalism from 1–10” lets length compensate for defects. Separate the criteria. For factual support, ask whether each claim is supported by the supplied context. For relevance, ask whether every section helps answer the user’s request. For completeness, list the required elements.

An effective relevance rule can state:

```text
Evaluate only relevance to the user's request.
Do not reward examples, background, headings, or restatements merely for being present.
Treat information that does not help answer the request as irrelevant.
Choose TIE when both responses satisfy the request equally well.
```

For a product that values brevity, define concision as its own criterion. Do not hide it inside “quality.” For a legal explanation or runbook where necessary detail matters, define required coverage rather than applying a global token penalty.

## Supply Evidence and Boundaries

Verbosity becomes especially seductive when the judge lacks a reference. Supply the user request, source context, expected facts, tool results, or checklist needed to evaluate the criterion. Then include boundary examples:

- a short answer that covers every required point;
- a long answer with the same information repeated;
- a long answer with useful additional evidence;
- a concise answer missing a critical constraint; and
- a verbose answer containing an unsupported claim.

These examples teach that useful information can justify length while length alone earns nothing.

Ask for structured output such as `{winner, reason, unsupported_claims, missing_requirements}`. Validate the schema and limit the reason. A free-form essay from the judge can rationalize an initial surface preference rather than expose the criterion that decided it.

## Analyze Bias by Length Slice

On a human-labeled calibration set, compare judge error by response-length ratio, not only absolute length. Suggested bins are roughly equal length, 1.25–2 times longer, and more than 2 times longer. Within each bin report:

- agreement with humans;
- false preference for the longer response;
- false passes caused by extra unsupported claims;
- tie rate; and
- swapped-order inconsistency.

You can fit a simple diagnostic model predicting whether the judge chooses a candidate from human preference, length difference, and order. A remaining length coefficient is evidence of association after those controls, not proof of a universal causal mechanism. The matched transformations provide the stronger causal test.

Also test whether bias differs by task. A judge may reward length for explanations but not extraction. Global correction can damage slices that were already sound.

## Mitigation Options and Their Tradeoffs

Start with the least destructive change:

- clarify one criterion and its exclusions;
- add human-adjudicated length controls as prompt examples;
- use pairwise `A/B/TIE` instead of a broad point score for reliability, but test the pairwise judge separately for verbosity bias;
- require claim-level support or checklist coverage;
- blind model identity and normalize wrappers; and
- route boundary cases to human review.

Length-normalizing the candidate text is risky. Truncation can remove a conclusion or citation and summarization introduces another model. If operational limits require a maximum answer length, evaluate that contract directly and reject outputs over the limit rather than silently editing them before judging.

A mathematical token penalty is also not a general solution. It encodes “shorter is better” and can reward incomplete responses. Use it only when the product has a documented cost or length constraint, and report quality and length separately.

## Keep the Judge Calibrated

Set an acceptance policy on a held-out suite: minimum human agreement, maximum erroneous longer-win rate on human ties, required success on concise-correct versus verbose-wrong controls, and maximum order inconsistency. Re-run it whenever the judge model, prompt, examples, or response formatting changes.

In live evaluation, monitor score versus length by workflow and investigate shifts. Do not automatically rescore history with a new judge; overlap old and new versions so changes in application quality can be separated from changes in judge bias.

## Official Documentation

- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [OpenAI: Graders](https://developers.openai.com/api/docs/guides/graders)
- [Ragas: Align an LLM as a judge](https://docs.ragas.io/en/stable/howtos/applications/align-llm-as-judge/)
- [NIST AI RMF Core: Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)

## Conclusion

Control verbosity bias by changing one thing at a time. Matched padding, compression, distractor, and quality-crossover pairs reveal whether a judge rewards length independently of the rubric. Atomic criteria, supplied evidence, explicit ties, length-slice reporting, and human-calibrated controls keep useful detail while preventing empty volume from winning.
