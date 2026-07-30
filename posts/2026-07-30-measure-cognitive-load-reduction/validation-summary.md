# Validation Summary: How to Measure Cognitive Load Reduction Without Turning Developer Experience into Guesswork

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Platform engineering
- Developer experience measurement
- Task-specific surveys
- Workflow telemetry and metrics
- Before-and-after and staged-rollout evaluation designs
- Telemetry privacy and label-cardinality practices

## Sources Consulted
- [DORA: Platform engineering](https://dora.dev/capabilities/platform-engineering/)
- [Microsoft Research: The SPACE of Developer Productivity](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/)
- [Microsoft Learn: Start your platform engineering journey](https://learn.microsoft.com/en-us/platform-engineering/journey)
- [NASA: NASA Task Load Index (TLX)](https://www.nasa.gov/human-systems-integration-division/nasa-task-load-index-tlx/)
- [CDC: Program Evaluation Framework, 2024](https://www.cdc.gov/mmwr/volumes/73/rr/rr7306a1.htm)
- [CDC: Step 8 Outcome Evaluation](https://www.cdc.gov/reproductive-health/media/files/teen-pregnancy/psba-gto/PSBA_GTO_Step8_508tagged.pdf)
- [Prometheus: Metric and label naming](https://prometheus.io/docs/practices/naming/)
- [OpenTelemetry: How to write semantic conventions](https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/)
- [OpenTelemetry: Security](https://opentelemetry.io/docs/security/)

## Issues Found
- The post stated that cognitive load “needs” a self-reported signal. Subjective workload instruments support self-report as a valid and practical method, but self-report is not the only possible measurement method. Changed the statement to say that a practical evaluation should include a self-reported signal.
- The post described a five- or seven-point agreement scale as “sufficient.” Scale length and consistency do not by themselves establish that an instrument is valid for every purpose. Changed the wording to describe that scale design as practical for a repeated pulse survey.
- The example decision rule referred to “I knew what to do next,” which was not one of the stable survey items defined earlier. Changed it to the exact item “I knew where to start this task” so the example follows the post's own requirement to keep survey wording stable.

## Review Notes
The event list and decision-rule blocks are illustrative pseudocode, not executable code or configuration. The post correctly treats survey items as task-level signals rather than a universal cognitive-load instrument, keeps operational measures diagnostic rather than substituting them for perception, warns about the limits of simple before-and-after comparisons, and recommends bounded telemetry dimensions and privacy-preserving reporting. If the survey is later used as a validated psychometric composite rather than as an internal pulse survey, its reliability and construct validity should be evaluated separately.
