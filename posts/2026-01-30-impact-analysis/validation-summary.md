# Validation Summary: How to Build Impact Analysis

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- SQL / PostgreSQL-style date and time functions
- Mermaid diagrams
- SRE incident management concepts
- SLA/SLO error budgets and burn rates

## Sources Consulted
- TypeScript Handbook: Classes and parameter properties - https://www.typescriptlang.org/docs/handbook/2/classes.html
- PostgreSQL Documentation: Date/Time Functions and Operators - https://www.postgresql.org/docs/current/functions-datetime.html
- Mermaid Documentation: State diagrams - https://mermaid.ai/open-source/syntax/stateDiagram.html
- Mermaid Documentation: Diagram syntax reference - https://mermaid.ai/open-source/intro/syntax-reference.html
- Google SRE Workbook: Alerting on SLOs - https://sre.google/workbook/alerting-on-slos/
- Google SRE Workbook: Implementing SLOs - https://sre.google/workbook/implementing-slos/

## Issues Found
- The revenue impact example result was mathematically incorrect. Updated the expected total loss from `~$393.75` to `~$9,843.75`, matching the formula shown in the comment.
- The user impact code did not define the expected unit for `errorRate` and could produce `NaN` when the baseline active user count was zero. Added a fractional-unit comment and a zero-baseline guard.
- The SLO status code reported remaining error budget percentage as `currentValue`, not the estimated availability value. Updated the formula to derive availability from the SLO target and remaining budget.
- The burn-rate comments claimed fixed exhaustion times that did not follow from the function's inputs. Replaced them with more accurate threshold descriptions.
- The service dependency example result could not be produced from the two services registered in the example. Added the missing services used by the dependency graph and updated the expected result.
- `getHighPriorityCustomers` could return duplicate customers when a customer used multiple affected services. Added a `Set` to deduplicate customers before sorting.
- The duration state diagram skipped the `acknowledged` state used by the TypeScript model. Updated the Mermaid diagram to include `Acknowledged`.
- The duration tracker exposed `incidentId` through bracket access to a private constructor parameter. Added a getter and updated the dashboard example to use it.
- The impact score example result did not match the calculator's normalization and weights. Updated the documented result to `37.7`, `SEV4`, and matching recommendations.
- The dashboard class used intentionally deferred initialization for several fields but did not mark that in TypeScript. Added definite assignment assertions so the snippet type-checks under strict mode.

## Review Notes
The TypeScript examples were checked with TypeScript 5.9.3 in strict mode, both as individual snippets for syntax and as one combined file for type compatibility. The SQL query uses PostgreSQL-compatible `INTERVAL` and `EXTRACT` syntax, with named parameters expected to be bound by the application or dashboarding layer.
