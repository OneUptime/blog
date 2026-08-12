# Validation Summary: What Baseline Do You Need Before Changing a Process?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Process baselining and operational measurement definitions
- YAML configuration examples
- Google SRE service level indicators and percentile analysis
- Kanban flow metrics
- DORA software delivery performance metrics
- Measurement System Analysis (MSA)
- Statistical Process Control (SPC) and control charts

## Sources Consulted
- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [DORA metrics history](https://dora.dev/insights/dora-metrics-history/)
- [The Kanban Guide, version 2025.5](https://kanbanguides.org/the-kanban-guide/)
- [Google SRE: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [ASQ: Measurement System Analysis](https://asq.org/training/measurement-system-analysis--msa--msaasq)
- [ASQ Quality Glossary: Measurement system](https://asq.org/quality-resources/quality-glossary/m)
- [NIST: What Are Process Control Techniques?](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc12.htm)
- [NIST: What Are Control Charts?](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)
- [NIST: Assessing Process Stability](https://www.itl.nist.gov/div898/handbook/ppc/section4/ppc45.htm)
- [NIST: Autocorrelation](https://www.itl.nist.gov/div898/handbook/eda/section2/eda251.htm)
- [NIST: Sample Sizes Required](https://www.itl.nist.gov/div898/handbook/prc/section2/prc222.htm)
- [NIST: Quantile](https://www.itl.nist.gov/div898/handbook/prc/section2/prc262.htm)
- [NIST: Censoring](https://www.itl.nist.gov/div898/handbook/apr/section1/apr131.htm)
- [NIST: Run-Sequence Plot](https://www.itl.nist.gov/div898/handbook/eda/section3/runseqpl.htm)

## Issues Found
- The operational-definition example treated every missing finish event as a censored open item. A missing event may instead be lost telemetry for completed work. Changed the text to classify only items confirmed unfinished at the window cutoff as right-censored and to require investigation of missing finish events.
- The delivery-outcome table used “failed-deployment recovery,” which is not the current DORA metric name. Changed it to “failed deployment recovery time.”
- The post called the Kanban Guide's four required measures “core flow measures.” Updated the wording to the guide's current term, “four mandatory flow metrics.”

## Review Notes
The YAML examples are syntactically valid and explicitly illustrative. The 8–12 week starting point is correctly presented as a pragmatic hypothesis rather than a standard. The cautions about small-sample tail percentiles, representative calendar coverage, structural breaks, dependent software-work observations, and mechanical use of manufacturing control limits are technically sound. The ASQ measurement-system concept applies reasonably to software telemetry, although software telemetry is the author's analogy rather than ASQ's explicit example. All links in the post resolve to the intended authoritative resources.
