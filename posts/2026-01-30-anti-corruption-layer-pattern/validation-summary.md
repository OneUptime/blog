# Validation Summary: How to Build the Anti-Corruption Layer Pattern

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Domain-Driven Design
- Anti-Corruption Layer pattern
- TypeScript
- Axios
- Mock Service Worker (MSW)
- prom-client / Prometheus metrics
- Jest-style unit and integration tests

## Sources Consulted
- Microsoft Azure Architecture Center: Anti-Corruption Layer pattern - https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer
- AWS Prescriptive Guidance: Anti-corruption layer pattern - https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/acl.html
- Axios documentation: Creating an instance - https://axios-http.com/docs/instance
- Axios documentation: API reference / isAxiosError - https://axios-http.com/docs/api_intro
- Mock Service Worker documentation: setupServer - https://mswjs.io/docs/api/setup-server/
- prom-client README: Counter, Histogram, labels - https://github.com/siimon/prom-client
- MDN Web Docs: Date.parse() - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse

## Issues Found
- The legacy timestamp parser used `new Date(timestamp)` for `YYYY-MM-DD HH:mm:ss`. MDN documents non-standard date string parsing as implementation-defined, so I changed the translator to parse that exact legacy format with a regular expression and numeric `Date` constructor arguments.
- The legacy timestamp formatter used `toISOString()`, which formats in UTC while the parser treated the legacy timestamp as a local timestamp. I changed it to format local date/time components consistently as `YYYY-MM-DD HH:mm:ss`.
- The Axios adapter used `instanceof AxiosError` for narrowing caught errors. Axios documents `axios.isAxiosError()` as the safe guard for accessing Axios-specific error fields, so I updated retry and 404 checks to use it.
- The adapter comment said it transformed errors into domain-specific exceptions, but the code logged and rethrew the original error. I corrected the comment to match the implementation.
- The `UnifiedUserFacade` and `AclMetrics` snippets imported unused symbols (`UserStatus` and `Gauge`), which can fail TypeScript builds with `noUnusedLocals`. I removed those unused imports.
- One unit test was named "handles missing middle name" while the fixture included a middle name. I corrected the test name to match the assertion.

## Review Notes
The remaining examples are illustrative and depend on placeholder legacy, CRM, and auth adapters/translators. For production code, the translator should also validate numeric date ranges and decide explicitly whether legacy timestamps are local time, UTC, or tied to a specific business timezone.
