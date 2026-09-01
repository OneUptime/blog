# Validation Summary: How to Turn LLM Evaluation into a Reliable CI Regression Gate

## Status
validated

## Post Type
Technical guide / CI implementation pattern

## Technologies Covered
- Large language model (LLM) evaluation
- CI/CD regression gates and non-inferiority policies
- Python 3.13
- NumPy
- SciPy `scipy.stats.bootstrap` and BCa confidence intervals
- GitHub Actions
- GitHub Actions dependency caching, artifacts, permissions, and secrets

## Sources Consulted
- OpenAI, Evaluation best practices — https://developers.openai.com/api/docs/guides/evaluation-best-practices
- OpenAI, Text generation: Prompt engineering — https://developers.openai.com/api/docs/guides/text#prompt-engineering
- OpenAI, Evals platform deprecation notice — https://developers.openai.com/api/docs/deprecations#2026-06-03-evals-platform
- NIST AI 800-3, *A Statistical Framework for Evaluating Generative Artificial Intelligence* — https://doi.org/10.6028/NIST.AI.800-3
- SciPy, `scipy.stats.bootstrap` — https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html
- SciPy 1.15.0 release notes — https://docs.scipy.org/doc/scipy-1.15.1/release/1.15.0-notes.html
- NumPy, `numpy.isfinite` — https://numpy.org/doc/stable/reference/generated/numpy.isfinite.html
- GitHub, `actions/setup-python` v6 caching documentation — https://github.com/actions/setup-python/tree/v6#caching-packages
- GitHub Docs, Building and testing Python — https://docs.github.com/en/actions/tutorials/build-and-test-code/python
- GitHub Docs, Workflow syntax for GitHub Actions — https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs, Setting exit codes for actions — https://docs.github.com/en/actions/how-tos/create-and-publish-actions/set-exit-codes
- GitHub Docs, Dependency caching reference — https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- GitHub Docs, Using secrets in GitHub Actions — https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- GitHub changelog, Deprecation of Node 20 on GitHub Actions runners — https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
- GitHub, `actions/upload-artifact` v7.0.1 release — https://github.com/actions/upload-artifact/releases/tag/v7.0.1

## Issues Found
1. **Per-case score vectors were not required to be one-dimensional.** A two-dimensional candidate and baseline could pass the original shape and size guard, after which SciPy would return array-valued confidence bounds and `float(ci.low)` would fail. Added explicit `ndim == 1` validation and clarified the error message.
2. **Finite input scores could still produce non-finite paired differences.** Floating-point subtraction can overflow even when both operands are finite. In the constant-difference branch, a positive infinite delta would not satisfy the regression comparison and could therefore pass. Added a finiteness check immediately after computing `deltas`.
3. **The BCa fallback explanation described an accidental-pass path that the nonconstant branch already rejected.** The existing bound check rejects non-finite BCa bounds. Reworded the explanation to say that the constant branch avoids requesting an undefined BCa interval and that the finite check rejects other non-finite intervals.
4. **The pip cache did not use the custom lockfile in its key.** `actions/setup-python` does not discover `evals/requirements.lock` by default; it searches for standard dependency filenames and can either hash an unrelated file or fail when none exists. Added `cache-dependency-path: evals/requirements.lock`.
5. **The artifact action used a deprecated runtime.** `actions/upload-artifact@v4` still declares Node 20, whose GitHub Actions runtime is deprecated and scheduled for removal on September 23, 2026. Updated the example to the current Node 24-based `actions/upload-artifact@v7`.
6. **The cache-security warning was overbroad.** GitHub permits low-trust pull-request runs to write isolated pull-request cache scopes that trusted branches cannot restore. Replaced the blanket warning against writable caches with precise guidance not to expose sensitive cache contents or permit writes to scopes later consumed by trusted workflows.

## Review Notes
- The SciPy example uses the current `rng` keyword, introduced in SciPy 1.15.0 and preferred for new code. The lockfile should pin SciPy 1.15 or newer.
- The two-sided 95% interval makes the lower-bound non-inferiority rule more conservative than a one-sided 95% rule. The post accurately presents this as a product-policy choice and distinguishes an inconclusive block from evidence of regression.
- The constant-difference point interval describes only the observed empirical resampling distribution, not uncertainty in a production population. The post states this caveat correctly.
- Repeated generations or judge scores for the same case should be aggregated or analyzed with a cluster-aware or hierarchical method rather than flattened into independent rows. The post does not flatten them and correctly requires independent, representative cases.
- `actions/checkout@v6` and `actions/setup-python@v6` remain supported Node 24 actions, although v7 is the latest major for each. Major-version action tags, `ubuntu-latest`, and Python `3.13` are mutable references; full action commit SHAs and exact runner/runtime versions would provide stricter reproducibility but are not required for this minimal example.
- Standard `pull_request` workflows from forks do not receive repository secrets, so a secret-dependent evaluator needs a separate safe policy for external fork contributions. The post correctly warns against exposing production secrets to untrusted pull-request code.
- `actions/upload-artifact@v7` is supported on GitHub.com but not GitHub Enterprise Server. GHES users need the artifact action version documented for their server release.
- The deprecation notice on OpenAI's hosted Evals platform does not affect this post because its example invokes a repository-owned evaluator and cites the OpenAI page only for methodology.
