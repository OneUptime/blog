# Validation Summary: How to Build Multivariate Flags

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Feature flags and multivariate flag evaluation
- A/B/n experimentation and percentage allocation
- TypeScript
- Node.js crypto module
- Python hashlib and dataclasses
- Go crypto/md5
- SQL-style analytics queries
- Vitest assertions
- Mermaid diagrams
- Statistical significance for conversion-rate experiments

## Sources Consulted
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Go crypto/md5 package documentation: https://pkg.go.dev/crypto/md5
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/2/functions.html
- Vitest expect API documentation: https://vitest.dev/api/expect
- Mermaid flowchart syntax documentation: https://mermaid.ai/open-source/syntax/flowchart.html
- Mermaid sequence diagram syntax documentation: https://mermaid.ai/open-source/syntax/sequenceDiagram.html
- Mermaid pie chart syntax documentation: https://mermaid.ai/open-source/syntax/pie.html
- NIST/SEMATECH e-Handbook of Statistical Methods, test for homogeneity of proportions: https://www.itl.nist.gov/div898/handbook/prc/section4/prc46.htm

## Issues Found
- The statistical significance section described the example as a simplified chi-squared test, but the code was not a chi-squared test and did not compare each variant's conversion rate against the control. It calculated a z-score against zero conversion rate, which would overstate confidence for almost any non-zero conversion rate. I changed this section to a simplified two-proportion z-test, updated the analysis code to compare variants against the control, and adjusted the sample confidence output to match the provided sample counts.
- The `VariantMetrics` type declared `confidence` as a number even though the sample output used `baseline` for the control row. I changed it to `number | 'baseline'` so the TypeScript type matches the documented output.

## Review Notes
- The MD5 examples are acceptable for deterministic, non-security bucketing, but MD5 is cryptographically broken and should not be reused for security-sensitive hashing.
- The Go examples were reviewed against official Go package documentation, but a local Go compiler was not available in the review environment.
- The TypeScript snippets include contextual placeholders such as `analytics`, `db`, `row`, `userId`, and `renderCheckout`; these are reasonable for blog examples but would need concrete application definitions in a runnable project.
