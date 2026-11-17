# Validation Summary: How to Build a Canary Evaluation Gate for Prompt and Tool Changes

## Status
validated

## Post Type
Technical guide with a Python decision-gate fixture and an application-owned JSON release manifest.

## Technologies Covered
- LLM prompt and tool evaluation, semantic grading, and deterministic checks
- Python 3 and the standard-library `math.isfinite` function
- JSON release manifests and versioned release bundles
- CI/CD canary deployment, observability, and rollback
- Paired comparisons, randomized allocation, confidence intervals, and sequential analysis

## Sources Consulted
- OpenAI, Evaluation best practices: https://developers.openai.com/api/docs/guides/evaluation-best-practices — task-specific evaluations, tool selection and arguments, grader calibration, and continuous evaluation.
- Google SRE Workbook, Canarying Releases: https://sre.google/workbook/canarying-releases/ — limited exposure, control comparisons, representative traffic, duration, metrics, and release decisions.
- Python documentation, mathematical functions: https://docs.python.org/3/library/math.html#math.isfinite — rejection of infinity and NaN.
- Python language reference, dictionary displays: https://docs.python.org/3/reference/expressions.html#dictionary-displays — dictionary unpacking and overriding sample values.
- RFC 8259, JSON: https://www.rfc-editor.org/rfc/rfc8259 — JSON syntax and permitted value types.
- SciPy documentation, paired t-test: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html — related observations and analysis of per-pair differences; consulted for the statistical explanation, not as a dependency of the example.
- Johari, Pekelis, and Walsh, Always Valid Inference: Bringing Sequential Analysis to A/B Testing: https://arxiv.org/abs/1512.04922 — monitoring-dependent stopping and sequentially valid inference.
- Author profile: https://github.com/nawazdhandala — verified that the linked www.github.com URL resolves to the intended profile.

## Issues Found
- The checkpoint guidance presented planned analysis points as an alternative to sequential methods without specifying repeated-testing adjustments. Prespecifying several looks alone does not preserve the error guarantees of an ordinary fixed-sample interval. Replaced that sentence with guidance to use a single prespecified final analysis, planned points with repeated-testing adjustments, or an appropriate sequential method. No other README content was changed.

## Review Notes
- Executed the exact Python code block under Python 3.15.0. All three published assertions passed. Seven additional checks passed for insufficient observations, error-rate boundaries, the quality lower-bound boundary, NaN, infinity, and critical-failure precedence over incomplete grading.
- Parsed the JSON example successfully. Its fields are explicitly application-owned, and its release identifiers are illustrative rather than vendor API or software-version claims. A real implementation must resolve the release identifier to the complete bundle described in the prose.
- The gate consumes an externally calculated quality lower bound; it does not calculate confidence intervals or establish sample-size adequacy. The observation count, exposure, and thresholds are explicitly example policy values. The quality comparison assumes candidate minus control on a higher-is-better scale.
- The fixture assumes required keys and valid numeric measurements. It is not a complete input-validation or deployment implementation. Its grading-completeness check precedes its operational error-rate check; critical failures take precedence over both.
- The advice on paired offline cases versus separately allocated live traffic is correct. Production analysis must respect the allocation unit and outcome maturity, as described in the post.
- Version bundling, argument-sensitive fixture replay, external-write reconciliation, stable conversation assignment, sanitized diagnostics, and rollback rehearsal are sound application design recommendations; they are not claims of built-in vendor functionality.
- Both official documentation links resolve to the intended resources. The OpenAI source currently includes an Evals platform deprecation notice. This post uses its general evaluation guidance and does not invoke or depend on that platform, so no API migration change was needed.
- There are no terminal commands or third-party API calls to validate. No live LLM, payment, tool backend, routing, or rollback system was exercised; validation covers the published fixture and technical guidance.
