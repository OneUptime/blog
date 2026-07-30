# Validation Summary: Survey Data vs Workflow Telemetry: How to Combine Qualitative and Quantitative Platform Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Platform engineering measurement
- Developer experience surveys
- Workflow telemetry and event-state modeling
- OpenTelemetry semantic conventions
- DORA software delivery metrics
- Privacy-preserving aggregate analytics

## Sources Consulted
- [DORA: Choosing measurement frameworks to fit your organizational goals](https://dora.dev/research/2025/measurement-frameworks/)
- [DORA: Platform engineering](https://dora.dev/capabilities/platform-engineering/)
- [DORA: Software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [Microsoft Research: The SPACE of Developer Productivity](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/)
- [OpenTelemetry: Semantic conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/)
- [OpenTelemetry semantic conventions specification](https://opentelemetry.io/docs/specs/semconv/)
- [OpenTelemetry: How to write semantic conventions](https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/)
- [OpenTelemetry: Handling sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/)
- [American Association for Public Opinion Research: Best Practices for Survey Research](https://aapor.org/standards-and-ethics/best-practices/)
- [American Association for Public Opinion Research: Standard Definitions](https://aapor.org/standards-and-ethics/standard-definitions/)
- [UK Information Commissioner's Office: Anonymisation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/)
- [NIST/SEMATECH e-Handbook of Statistical Methods: Measures of Skewness and Kurtosis](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35b.htm)

## Issues Found
- The illustrative state machine allowed failure, abandonment, or resumption to follow any state, including the terminal `succeeded` state. Limited failure and abandonment to in-progress states, and limited resumption to failed or abandoned workflows.
- The privacy guidance referred generically to “metric labels.” Clarified this as “metric attribute values (labels)” to use OpenTelemetry terminology while retaining the familiar Prometheus term.

## Review Notes
- The post contains technical implementation guidance and text-based data/state models, but no executable code, terminal commands, configuration, or version-pinned API examples.
- All four external links in the post returned HTTP 200 responses and pointed to the named authoritative resources at review time.
- The OpenTelemetry semantic-conventions specification reviewed was version 1.43.0. It is versioned, and its CI/CD conventions should be checked before defining custom workflow names and attributes.
- Aggregation lowers privacy risk but does not by itself guarantee anonymity. A reporting threshold should be selected from a contextual re-identification risk assessment, with small-cell suppression or broader aggregation where needed.
- The ICO notes that its anonymisation guidance is under review following the Data (Use and Access) Act, so organizations should recheck it when implementing the privacy controls described here.
- A response rate is an important survey-quality diagnostic but does not by itself establish representativeness; cohort coverage and possible nonresponse bias still need review.
