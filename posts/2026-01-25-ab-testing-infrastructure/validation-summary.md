# Validation Summary: How to Implement A/B Testing Infrastructure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- A/B testing infrastructure
- Feature flags
- Experiment assignment and deterministic hashing
- TypeScript
- Node.js crypto
- Express
- Analytics event batching
- Python
- NumPy
- SciPy
- Two-proportion z-tests and sample size estimation

## Sources Consulted
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- Express Routing guide: https://expressjs.com/en/guide/routing/
- Express 5.x API reference: https://expressjs.com/en/api/
- SciPy `scipy.stats.norm` documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norm.html
- SciPy `rv_continuous.ppf` documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rv_continuous.ppf.html
- statsmodels `proportions_ztest` documentation: https://www.statsmodels.org/dev/generated/statsmodels.stats.proportion.proportions_ztest.html
- statsmodels `power_proportions_2indep` documentation: https://www.statsmodels.org/dev/generated/statsmodels.stats.proportion.power_proportions_2indep.html
- Penn State STAT 200 notes on two independent proportions: https://online.stat.psu.edu/stat200/book/export/html/193

## Issues Found
- Added missing TypeScript helper types for `UserContext` and `AssignmentResult` so later snippets have explicit type definitions.
- Updated the Node.js crypto import from `crypto` default import to `node:crypto` named import with `createHash`, matching current Node.js module usage.
- Corrected the assignment comment from "consistent hashing" to "stable hash" because the implementation is deterministic bucketing, not consistent hashing in the distributed hash-ring sense.
- Hardened the targeting `in` operator so it checks that the rule value is an array before calling `includes`.
- Fixed cached assignment handling so a deleted or renamed variant does not return `undefined` while claiming the user is in the experiment.
- Fixed variant assignment fallback so users are not marked `inExperiment: true` when no variant is selected.
- Removed an unused Python `List` import.
- Corrected the two-proportion confidence interval to use the unpooled standard error, while keeping the pooled standard error for the z-test under the null hypothesis.
- Updated the sample size calculation to use separate null and alternative standard error terms for a two-proportion normal approximation.

## Review Notes
The snippets are still tutorial-level examples and assume surrounding application services exist, such as `experimentService`, `analysisService`, `analytics`, `getExperimentsForFlag`, and `getActiveAssignments`. The in-memory assignment cache is acceptable for illustrating the concept, but production deployments should persist assignments or rely on deterministic recomputation across instances. Local Python execution could not be completed because SciPy is not installed in this environment; the Python formulas and API calls were reviewed against official SciPy and statsmodels documentation instead.
