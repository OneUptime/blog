# Validation Summary: How to Build Flag Conversion Tracking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- Node.js crypto module
- Fetch API
- UUID generation with the `uuid` package
- Feature flag exposure and conversion attribution
- A/B testing statistics
- Chi-square sample ratio mismatch checks
- ROI calculations

## Sources Consulted
- TypeScript Handbook: Utility Types, `Record` - https://www.typescriptlang.org/docs/handbook/utility-types.html
- Node.js Crypto API, `crypto.createHash()` - https://nodejs.org/api/crypto.html
- MDN Web Docs: Fetch API - https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- npm package documentation: `uuid` quickstart - https://www.npmjs.com/package/uuid
- NIST/SEMATECH e-Handbook of Statistical Methods: sample sizes for testing proportions - https://www.itl.nist.gov/div898/handbook/prc/section2/prc242.htm
- NIST/SEMATECH e-Handbook of Statistical Methods: binomial proportion test - https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/binotest.htm
- Microsoft Research: Diagnosing Sample Ratio Mismatch in A/B Testing - https://www.microsoft.com/en-us/research/articles/diagnosing-sample-ratio-mismatch-in-a-b-testing/
- Apache Commons Math: `ChiSquaredDistribution` API reference - https://commons.apache.org/proper/commons-math/javadocs/api-3.6.1/org/apache/commons/math3/distribution/ChiSquaredDistribution.html

## Issues Found
- The `ConversionEvent.metadata` type only allowed `source`, `category`, and `properties`, but the implementation stored top-level values such as `trackedAt`, `currency`, `plan`, and `action`. Changed the type to a `Record` matching the implementation.
- The user ID "hashing" example used Base64 encoding with `Buffer.from(...)`, which is reversible and not a hash. Replaced it with Node.js `crypto.createHash('sha256')`.
- Session-based attribution divided by `exposures.length` without handling the zero-exposure case. Added an empty-result guard.
- Time-window attribution returned raw recency scores as weights, so multiple attributed exposures could sum to more than 1. Normalized recency weights and handled a zero-total case.
- The minimum detectable effect standard error calculation had an extra factor of 2. Corrected it to use `sqrt(p * (1 - p) * (1 / n1 + 1 / n2))`.
- The annual ROI calculation named a margin-adjusted value `projectedAnnualRevenue`. Changed projected annual revenue to gross revenue and used a separate projected annual profit value for ROI.
- The sample ratio mismatch snippet called an undefined `chiSquareCDF` helper. Added a 1-degree-of-freedom chi-square CDF helper based on the error function and updated the call.

## Review Notes
The article remains a conceptual guide with illustrative snippets. Several snippets still rely on application-specific types such as `Attribution`, `ExposureEvent`, and `UserContext`; that is acceptable for this post because the examples are focused on architecture and algorithms rather than a drop-in library.
