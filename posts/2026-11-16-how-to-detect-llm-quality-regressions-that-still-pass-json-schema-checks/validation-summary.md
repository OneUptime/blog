# Validation Summary: How to Detect LLM Quality Regressions That Still Pass JSON Schema Checks

## Status

validated

## Post Type

Technical guide with a JSON Schema contract and a standalone Python business-rule validator.

## Technologies Covered

- Large language model evaluation and regression testing
- OpenAI Structured Outputs
- JSON Schema
- Python 3
- Deterministic business checks, evidence validation, and model-based grading

## Sources Consulted

- [OpenAI: Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) — schema adherence, remaining semantic errors, refusals, and incomplete responses.
- [OpenAI: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) — task-specific criteria, human calibration, held-out evaluation, edge cases, and component-level evaluation.
- [JSON Schema: Object](https://json-schema.org/understanding-json-schema/reference/object) — properties, required fields, and additional properties.
- [JSON Schema: Numeric types](https://json-schema.org/understanding-json-schema/reference/numeric) — integer constraints and numeric bounds.
- [JSON Schema: Enumerated values](https://json-schema.org/understanding-json-schema/reference/enum) — allowed decision values.
- [Python: Compound statements](https://docs.python.org/3/reference/compound_stmts.html) — function definitions and conditional control flow.
- [Python: Simple statements](https://docs.python.org/3/reference/simple_stmts.html#the-assert-statement) — assertion and return behavior.
- [python-jsonschema: Schema validation](https://python-jsonschema.readthedocs.io/en/stable/validate/) — validator used for local verification.
- [Author's GitHub profile](https://github.com/nawazdhandala) — checked the author link and its redirect.

## Issues Found

No technical issues found.

## Review Notes

- The README required no changes. Its distinction between schema compliance and task correctness is accurate; the sample schema cannot establish external ownership, eligibility, or remaining refundable balance.
- The schema uses valid object, string, integer, enum, required, and additionalProperties keywords. It is presented as an output contract, not as a complete OpenAI API request.
- Executed the original Python example and confirmed its assertion returns only `wrong_refund_amount`. The function uses ordinary Python syntax and no deprecated APIs.
- Validated the schema against the Draft 2020-12 metaschema. Checked eight schema-valid business-rule cases covering correct approval, incorrect identity, excessive and negative amounts, ineligible approval, nonzero denial, zero-value review, and zero-value denial. Checked six schema-invalid cases covering string, fractional, and boolean amounts, an unknown decision, an extra property, and a missing required property.
- The zero-value denial case intentionally passes this narrow checker even when the fixture is eligible. The post explicitly limits the example's policy and calls for appropriate additional semantic checks. A complete evaluator needs an expected-decision criterion to detect unjustified denials and separate evidence checks for citation support.
- Nonnegative amounts and some conditional constraints could also be encoded in JSON Schema. That does not invalidate the example: its supplied schema omits these constraints, and authoritative external facts still require validation against trusted data.
- The recommendations on negative and positive controls, independent evidence, separate quality dimensions, stable comparison inputs, explicit denominators, and critical slices are sound evaluation practices. No empirical accuracy guarantee or universal refund policy is asserted.
- All three documentation links resolve to the intended resources; the author URL redirects to the expected GitHub profile. There are no terminal commands or version-specific API calls in the post.
- The linked OpenAI evaluation guide currently includes an Evals platform deprecation notice. This post uses general evaluation guidance and does not depend on that platform or its API, so no correction is necessary.
- Verification covered the local examples and documentation. No live model calls or production refund operations were needed or performed.
