# Validation Summary: How to Measure the Success of Platform Documentation and Discoverability

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Backstage Analytics API
- Backstage Search
- Backstage TechDocs
- Google Search Console
- Google Analytics
- Documentation analytics and docs-as-code practices

## Sources Consulted

- [Backstage: Plugin Analytics](https://backstage.io/docs/frontend-system/building-plugins/analytics/)
- [Backstage: Search](https://backstage.io/docs/features/search/)
- [Backstage: TechDocs](https://backstage.io/docs/techdocs/generated-index/)
- [Google Search Central: Using Search Console and Google Analytics data](https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console)
- [DORA: Platform engineering](https://dora.dev/capabilities/platform-engineering/)
- [Prometheus: Instrumentation](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus: Metric and label naming](https://prometheus.io/docs/practices/naming/)
- [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## Issues Found

- The Backstage analytics statement did not mention that the documented events captured depend on the plugins and components installed. Updated it to reflect the conditional wording in Backstage's official event documentation.
- The query-handling guidance suggested hashing as an option for aggregate reporting. Hashing free-form queries does not reduce metric cardinality and may still retain sensitive pseudonymous data. Updated the guidance to use bounded query categories for aggregate metrics while limiting detailed data to an access-controlled event store.

## Review Notes

The fenced blocks are conceptual workflow and metric definitions rather than executable code. There are no terminal commands, configuration snippets, or version-specific API examples to validate. All external links in the post resolved successfully during review.
