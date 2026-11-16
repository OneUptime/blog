# Validation Summary: How to Validate Guardrails Against Independent Outcomes and Human Review

## Status
validated

## Post Type
Technical guide with executable Python scoring code and a synthetic JSON decision record.

## Technologies Covered
- LLM guardrails, PII detection, schema validation, and tool authorization
- Retrieval-augmented generation (RAG) evaluation
- Python 3 and binary classification metrics
- JSON decision ledgers, HTTP asynchronous processing, and idempotency
- Independent human review, sampling, counterfactual outcomes, and regression testing
- NIST AI Risk Management Framework

## Sources Consulted
- NIST AI RMF Core, MEASURE function: https://airc.nist.gov/airmf-resources/airmf/5-sec-core/ — independent assessors, documented limitations, evaluation, and monitoring.
- Python built-in functions: https://docs.python.org/3/library/functions.html — `sum`, `len`, and `print`.
- Python built-in types: https://docs.python.org/3/library/stdtypes.html#boolean-type-bool — Boolean values and numeric behavior.
- scikit-learn confusion matrix: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.confusion_matrix.html — reference/prediction orientation and false-positive/false-negative definitions.
- scikit-learn data leakage guidance: https://scikit-learn.org/stable/common_pitfalls.html#data-leakage — keep evaluation data separate from data used to make development choices.
- JSON Schema documentation: https://json-schema.org/understanding-json-schema/about — schema constraints and JSON structure.
- Presidio documentation: https://presidio.dataprivacystack.org/ — sensitive-entity detection scope and limitations.
- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html — authorization checks, permissions, logging, and integration testing.
- RFC 9110, section 15.3.3: https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3 — HTTP 202 acceptance does not establish completion.
- Stripe advanced error handling: https://docs.stripe.com/error-low-level — timeouts, uncertain outcomes, and idempotent retries.
- Hugging Face human evaluation guide: https://github.com/huggingface/evaluation-guidebook/blob/main/contents/human-evaluation/basics.md — reviewer selection and human evaluation biases.
- CDC NHANES sample design: https://wwwn.cdc.gov/nchs/nhanes/tutorials/SampleDesign.aspx — unequal selection probabilities and sampling weights.
- David A. Stephens, SISCER potential-outcomes course materials: https://si.biostat.washington.edu/sites/default/files/modules/SISCER2021-PS-MMA-Color.pdf — observed versus counterfactual outcomes.
- Author profile link: https://github.com/nawazdhandala — verified the post's `www.github.com` URL redirects to the intended profile.

## Issues Found
- The regression guidance called cases derived from verified failures a “held-out regression set.” Cases used to guide fixes cannot also serve as independent held-out evaluation evidence. Changed this to “regression set” and added a sentence reserving a separate held-out evaluation set that is not used to guide fixes. This preserves regression coverage while avoiding evaluation leakage.

## Review Notes
- Executed the exact Python code block using Python 3.15.0. Its assertion passed and it printed `{'unsafe_pass_rate': 1.0, 'false_block_rate': 0.5, 'unknown_reviews': 1}`.
- With `block` as positive, unsafe passes are false negatives and false blocks are false positives. The denominators correctly yield FN/(TP+FN) and FP/(FP+TN), respectively. The example excludes the unknown review and handles empty class denominators with `None`.
- Parsed the JSON fixture successfully. Its fields and policy-version string are explicitly application-defined, not vendor API fields or software versions.
- The example scores independent policy labels; it does not claim to reconcile external effects. The text appropriately separates missing evidence, simulated outcomes, and observed effects. A blocked action can receive a policy label even though its execution counterfactual remains unobserved.
- The HTTP acceptance and timeout explanations are correct. Correlation and reconciliation depend on the external system's supported identifiers and authoritative state.
- Blinding, additional reviewers, adjudication, and review of both allowed and blocked decisions are appropriate methodological recommendations. Two reviewers are a suggested practice, not a guarantee of correctness or a NIST-mandated number.
- Both technical reference links and the author link resolved to the intended resources. No terminal commands or vendor configuration snippets require validation, and the Python example uses no deprecated or third-party APIs.
- NIST's page identifies the material as AI RMF 1.0 and notes that revision is in progress. The principles cited remain supported by the linked material.
