# Validation Summary: DORA Metrics for Platform Teams: What They Measure—and What They Miss

## Status

validated

## Post Type

Technical guide and measurement reference

## Technologies Covered

- DORA software delivery performance metrics
- Platform engineering and internal developer platforms
- Software delivery and DevOps measurement
- Developer experience and the SPACE framework
- Service-level objectives (SLOs) and error budgets
- Value-stream mapping
- Difference-in-differences evaluation

## Sources Consulted

- [DORA: Software delivery performance metrics](https://dora.dev/guides/dora-metrics/) — verified the current five-metric model, throughput and instability groupings, metric definitions, application/service-level scope, and cautions against targets, disparate comparisons, and competition.
- [DORA: A history of software delivery metrics](https://dora.dev/insights/dora-metrics-history/) — verified the 2023 replacement and narrowing of mean time to recover/time to restore service with failed deployment recovery time, and the 2024 addition of deployment rework rate.
- [DORA: Accelerate State of DevOps Report 2024](https://dora.dev/research/2024/dora-report/) — checked the official report context for the five-metric model and platform-engineering measurement claims.
- [DORA: Value stream mapping for software delivery](https://dora.dev/guides/value-stream-management/) — verified that value-stream mapping can cover the broader idea-to-production journey, including wait times, handoffs, and bottlenecks beyond the commit-to-production DORA boundary.
- [Microsoft Research: The SPACE of Developer Productivity](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/) and the [ACM publication](https://doi.org/10.1145/3454122.3454124) — verified that developer productivity is multidimensional and should combine perceptual/human measures with workflow and system measures.
- [World Bank: Impact Evaluation in Practice, Second Edition](https://openknowledge.worldbank.org/bitstream/handle/10986/25030/9781464807794.pdf) — verified the difference-in-differences comparison and the need for identifying assumptions before giving the estimate a causal interpretation.
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/) — verified that SLOs and error budgets are service-reliability measures distinct from application delivery metrics, and that availability and latency are appropriate SLI/SLO dimensions.

## Issues Found

No technical issues found.

## Review Notes

- The post contains technical implementation details and metric-calculation pseudocode, so it was fully reviewed rather than classified as a non-code blog post.
- The event-field example is intentionally tool-independent. Implementations must ensure that the referenced commit, deployment, and incident records supply the timestamps and classifications required by the formulas; the post correctly calls for retained linkage, documented definitions, and visible exclusions.
- The difference-in-differences formula is correct. A causal interpretation additionally depends on design assumptions such as comparable pre-adoption trends and the absence of differential concurrent changes; the post appropriately warns readers not to claim causality unless the design supports it.
- All links in the post point to the intended official or primary resources. The Microsoft Research endpoint may reject some automated HTTP clients while remaining a valid publication page.
