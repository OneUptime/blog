# Validation Summary: How to Build Ground Truth for RAG Evaluation When No Reference Answers Exist

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Retrieval-augmented generation (RAG)
- Ground-truth and evaluation-dataset design
- JSON evaluation records
- Ragas test-set generation and evaluation schemas
- Human annotation, agreement review, and adjudication
- Dataset versioning, leakage prevention, and staleness management

## Sources Consulted

- [OpenAI Evaluation Best Practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [OpenAI API deprecations: Evals platform](https://developers.openai.com/api/docs/deprecations#2026-06-03-evals-platform)
- [Ragas Testset Generation for RAG](https://docs.ragas.io/en/stable/concepts/test_data_generation/rag/)
- [Ragas evaluation schemas](https://docs.ragas.io/en/stable/references/evaluation_schema/)
- [NIST AI Risk Management Framework Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- [NIST AI RMF Playbook: Measure](https://airc.nist.gov/airmf-resources/playbook/measure/)
- [scikit-learn `GroupKFold` documentation](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.GroupKFold.html)
- [scikit-learn `TimeSeriesSplit` documentation](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html)
- [Question and Answer Test-Train Overlap in Open-Domain Question Answering Datasets](https://aclanthology.org/2021.eacl-main.86/)
- [Unanswerability Evaluation for Retrieval Augmented Generation](https://aclanthology.org/2025.acl-long.415/)
- [GaRAGe: A Benchmark with Grounding Annotations for RAG Evaluation](https://aclanthology.org/2025.findings-acl.875/)

## Issues Found

No technical issues found.

## Review Notes

- The post qualifies as a technical guide because it defines an implementable evaluation-record structure and a concrete annotation, sampling, splitting, versioning, and audit workflow. Its JSON example is syntactically valid.
- The example record is an application-defined schema, not a claimed Ragas schema. Current Ragas terminology uses `user_input`, `reference_contexts`, and `reference`; the post's generic wording about generated queries, contexts, and references is accurate.
- The Ragas documentation confirms the described knowledge-graph and scenario-based generation process and its single-hop, multi-hop, specific, and abstract query taxonomy.
- The cited OpenAI best-practices page now notes that the OpenAI Evals platform is deprecated and scheduled to shut down on November 30, 2026. The post cites only evaluation methodology and does not instruct readers to use that platform or its API, so no post correction is required.
- NIST states that AI RMF 1.0 is being updated. The published Core and Measure Playbook remain live and support the post's guidance on documented test sets, deployment-representative evaluation, independent or domain-expert review, monitoring, and reassessment.
- No executable commands or library API examples are present, and no changes to `README.md` were necessary.
