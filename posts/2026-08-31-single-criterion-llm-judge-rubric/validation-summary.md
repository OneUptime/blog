# Validation Summary: How to Write a Single-Criterion Rubric That an LLM Judge Can Apply Consistently

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- LLM-as-a-judge evaluation
- Single-criterion evaluation rubrics
- Human-label calibration and held-out validation
- Prompt-injection-aware evaluator input contracts
- JSON structured output contracts
- Python post-processing and validation
- Ragas judge alignment
- NIST AI Risk Management Framework

## Sources Consulted

- OpenAI Evaluation best practices: https://developers.openai.com/api/docs/guides/evaluation-best-practices
- OpenAI Graders guide: https://developers.openai.com/api/docs/guides/graders
- OpenAI Evals platform deprecation notice: https://developers.openai.com/api/docs/deprecations#2026-06-03-evals-platform
- Ragas, Align an LLM as a Judge: https://docs.ragas.io/en/stable/howtos/applications/align-llm-as-judge/
- Ragas metrics reference: https://docs.ragas.io/en/stable/references/metrics/
- NIST AI RMF Core, Measure: https://airc.nist.gov/airmf-resources/airmf/5-sec-core/
- NIST AI 800-2 Initial Public Draft, Practices for Automated Benchmark Evaluations of Language Models: https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.800-2.ipd.pdf
- NIST AI 100-2e2025, Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations: https://doi.org/10.6028/NIST.AI.100-2e2025
- RFC 8259, The JavaScript Object Notation (JSON) Data Interchange Format: https://www.rfc-editor.org/rfc/rfc8259
- JSON Schema Draft 2020-12 validation specification: https://json-schema.org/draft/2020-12/json-schema-validation
- Python built-in types documentation: https://docs.python.org/3/library/stdtypes.html#mapping-types-dict
- Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena: https://proceedings.neurips.cc/paper_files/paper/2023/hash/91f18a1287b398d378ef22505bf41832-Abstract-Datasets_and_Benchmarks.html

## Issues Found

- The template said it contained seven parts but displayed eight labeled parts. Changed the count to eight.
- `FAIL` covered material claims that lack source support, while `CANNOT_JUDGE` also covered a source that was insufficient to assess a material claim. These conditions overlapped. Limited `CANNOT_JUDGE` to an absent or unreadable required source and clarified that a readable source which omits support yields `FAIL`.
- The output example used a bare ellipsis inside an array, which is not valid JSON under RFC 8259, and represented all labels as one pipe-delimited string. Replaced it with valid JSON and stated the exact keys, allowed labels, and field types.
- The Python post-processor checked only the label and non-empty failure evidence, so it accepted outputs that violated the stated three-field contract. Added checks for an object with exactly the required keys, a closed string label, an array of non-empty evidence strings, and a non-empty reason.
- The claim that exclusions prevent verbosity and halo effects was too absolute. Changed it to say that exclusions help reduce verbosity bias and halo effects, and likewise described `CANNOT_JUDGE` as an explicit alternative rather than a guarantee.

## Review Notes

- The revised Python validator is syntactically valid and was exercised with valid `PASS`, `FAIL`, and `CANNOT_JUDGE` objects plus invalid-label, missing-key, wrong-type, empty-reason, and missing-failure-evidence cases.
- All five external links in the post resolve to their intended destinations; the author link redirects to its canonical GitHub URL.
- OpenAI's evaluation guidance supports specific criteria, pass/fail or pairwise evaluation, response-length controls, clear rubrics, and calibration against human labels. It also identifies position and verbosity bias as ongoing limitations.
- OpenAI is deprecating the Evals platform. Existing evals are scheduled to become read-only on October 31, 2026, and the Evals dashboard and API are scheduled to shut down on November 30, 2026. Graders used in eval workflows are part of that transition. This does not invalidate the provider-independent guidance in the post, but the links should be revisited after the transition.
- The current Ragas guide supports representative expert labels, judge-human comparison, and false-positive/false-negative analysis. Its metrics reference supports train/test splitting for alignment and validation.
- The cited NIST page is the relevant AI RMF Core Measure section. It reflects AI RMF 1.0, which NIST is updating, but its repeatable evaluation, documentation, expert review, and ongoing monitoring guidance remains applicable.
- NIST's 2026 language-model benchmark evaluation document is still an Initial Public Draft. It supports separate development and test sets, human comparison, inter-rater agreement, versioning, and preservation of exact evaluation settings.
- No model, SDK, CLI, or library versions are prescribed by the post. No other technical issues were found.
