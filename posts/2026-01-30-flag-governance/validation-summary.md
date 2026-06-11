# Validation Summary: How to Build Flag Governance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Feature flag governance
- TypeScript
- Python
- YAML
- Mermaid flowcharts
- Compliance and audit workflow design

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python statistics documentation: https://docs.python.org/3/library/statistics.html
- TypeScript Handbook, Classes: https://www.typescriptlang.org/docs/handbook/2/classes.html
- TypeScript Handbook, Object Types and interfaces: https://www.typescriptlang.org/docs/handbook/2/objects.html
- MDN JavaScript await reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await
- Mermaid flowchart syntax documentation: https://mermaid.js.org/syntax/flowchart.html
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/

## Issues Found
- The TypeScript naming validator split flag names on every hyphen, so `release-checkout-express-shipping` would parse `feature` as `express` and `variant` as `shipping`, contradicting the documented example. Updated the parser to treat category and team as fixed leading segments, keep hyphenated feature names intact, and only parse experiment variants when they match a stricter `v` plus digits pattern.
- The optional variant pattern was too broad to distinguish variants from ordinary hyphenated feature words. Tightened the example policy and TypeScript policy from `^[a-z0-9]+$` to `^v[0-9]+$`.
- The ownership TypeScript example used top-level `await` in a non-module script. Wrapped the example usage in an async `main()` function so it compiles in a normal TypeScript file.
- The Python examples used `datetime.utcnow()`, which is deprecated as of Python 3.12. Replaced those calls with `datetime.now(timezone.utc)` and imported `timezone`.
- The compliance checker could return `NaN` for unknown categories or an empty flag list because of division by zero. Added an unknown-category result with score `0` and made empty reports return a `100` compliance rate.
- The p95 review-time calculation used `int(len(review_times) * 0.95)`, which selects the wrong percentile index for common list sizes. Replaced it with a `math.ceil(...)-1` index.

## Review Notes
Validated extracted TypeScript snippets with `tsc --noEmit`, Python snippets with `python3 -m py_compile`, and YAML snippets with PyYAML. Mermaid diagrams were reviewed against Mermaid flowchart syntax documentation; no diagram syntax issues were found.
