# Validation Summary: How to Configure Property-Based Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- JavaScript
- fast-check
- Jest
- Python
- Hypothesis
- npm
- pip

## Sources Consulted
- fast-check API Reference: https://fast-check.dev/docs/api/
- fast-check number arbitraries: https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/
- fast-check string migration notes: https://fast-check.dev/docs/migration-guide/from-3.x-to-4.x/
- fast-check runner parameters: https://fast-check.dev/docs/api/interfaces/Parameters/
- fast-check configureGlobal API: https://fast-check.dev/docs/api/functions/configureGlobal/
- Hypothesis Quickstart: https://hypothesis.readthedocs.io/en/latest/quickstart.html
- Hypothesis Custom strategies: https://hypothesis.readthedocs.io/en/latest/tutorial/custom-strategies.html
- Jest configuration documentation: https://jestjs.io/docs/configuration
- npm package dependency documentation: https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file/
- pip install documentation: https://pip.pypa.io/en/latest/cli/pip_install/

## Issues Found
- Replaced `fc.char()` with `fc.string({ minLength: 1, maxLength: 1 })` because current fast-check v4 removed single-character string arbitraries in favor of constrained `fc.string()`.
- Changed order `price` and `discount` generators from `fc.float(...)` to `fc.double(...)`. Current fast-check requires `fc.float` bounds to be valid 32-bit floats, and `0.01` is not accepted as a 32-bit float constraint.
- Corrected the Hypothesis custom strategy decorator from `from hypothesis import composite` / `@composite` to `@st.composite`, matching the documented `hypothesis.strategies` API usage.
- Corrected the failure reproduction example so the provided seed and path actually reproduce a failure with current fast-check.
- Clarified that fast-check runs 100 cases by default, not necessarily "hundreds", unless configured.
- Clarified that property-based testing catches edge cases only when the generators and properties cover those cases.
- Changed shrinking language from "smallest" to "simpler" because shrinking is intended to reduce counterexamples, but "smallest" can overstate the guarantee.
- Updated the `seed: Date.now()` comment because a changing time-based seed is not reproducible by default; the printed seed must be recorded to replay failures.

## Review Notes
The main examples are technically valid after the fixes. The JavaScript `reverseString` implementation uses UTF-16 code unit reversal via `split('')`, so it is not a complete Unicode grapheme-aware string reversal; the post now avoids claiming the shown properties automatically catch all Unicode issues.
