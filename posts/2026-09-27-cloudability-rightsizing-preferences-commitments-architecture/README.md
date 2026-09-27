# Cloudability Rightsizing: Preserve Commitments and CPU Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Optimization, Cloud, AWS

Description: Tune Cloudability rightsizing candidates with explicit commitment, processor compatibility, missing-metric, savings, and workload review policies.

A cheaper recommended instance is useful only if the workload can run on it and the change improves the organization's economics. A processor change may require rebuilding software, while a family change may reduce the usefulness of existing commitments.

Cloudability's rightsizing preferences help control the candidate set. Treat these settings as an expression of reviewed policy, then validate individual recommendations against workload and commitment evidence.

## Separate Basic and Advanced policy

For Cloudability-generated recommendations, use **Settings > Rightsizing Preferences > Basic**. Premium's Advanced settings govern the Turbonomic engine and are not interchangeable with Basic preferences. [Rightsizing Preferences](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=ar-rightsizing-preferences)

Write down the engine and scope before changing anything. A global preference is a broad decision; it should not be changed casually to make one difficult resource produce a more attractive recommendation.

For a team piloting a policy, first collect a small representative recommendation set. Preserve the before-state, inspect the effect, and agree how to reverse the configuration if the candidate list becomes unsuitable.

## Use family constraints with a commitment review

The Basic compute settings include controls for current generations and remaining within the existing instance family. These can help align recommendations with commitment constraints, but do not prove that a particular commitment covers the proposed destination. [Compute preference controls](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=ar-rightsizing-preferences)

For every significant change, review the actual commitment's eligible usage, region, scope, term, and flexibility with the FinOps owner. Similar instance names are not a coverage contract.

Consider an original example: the current VM costs $100 at on-demand pricing, but its historical effective cost is $65. A smaller destination costs $80 on demand. The on-demand comparison suggests $20 savings; the effective comparison against that target suggests a $15 increase.

Cloudability's Effective basis uses historical current-resource cost including amortized commitments and on-demand pricing for the proposed resource. It can therefore be more conservative. Configured custom pricing can affect both bases. [Rightsizing cost-basis FAQ](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=rightsizing-faq)

The example illustrates why expected resource efficiency and expected invoice reduction should be reviewed separately. Reusable freed commitment capacity may benefit another workload, but document that plan rather than counting hypothetical savings twice.

## Make processor compatibility explicit

Basic preferences allow processor exclusions and cross-architecture recommendations. Before enabling a new architecture, check the operating-system image, application binaries, runtime dependencies, observability agents, security tooling, and any licensed software.

A useful review table is:

| Workload characteristic | Evidence before allowing a new architecture |
| --- | --- |
| Compiled application | Reproducible build for the destination architecture |
| Container workload | Suitable image manifests and tested dependencies |
| Vendor appliance | Vendor-supported deployment configuration |
| Native extension | Compatibility and performance test |
| Commercial software | License and support implications |

This is an engineering acceptance process, not a capability Cloudability can infer completely from utilization charts. A low-risk resource recommendation does not certify every application dependency.

Test a representative workload under load. Compare latency, throughput, error rate, and resource headroom, including startup behavior and maintenance tasks. A successful boot is a weak compatibility test.

## Keep absent utilization evidence visible

The Capacity Reduction preference controls recommendations that reduce a resource dimension when its utilization metrics are unavailable. Review this setting carefully for memory-sensitive workloads. [Capacity and savings preferences](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=ar-rightsizing-preferences)

If memory data is absent, do not label the workload's memory usage as zero. Either improve the evidence or use a policy that reflects the organization's uncertainty. The right choice depends on the workload's failure cost and available monitoring.

Separate global eligibility from local operational approval. A policy may allow a class of recommendation while a particular database or latency-sensitive service still needs a more conservative capacity margin.

## Set savings thresholds against implementation effort

A minimum savings threshold can reduce low-value review work. Establish what savings period the setting uses, and compare it with the cost of deploying and verifying a change.

Also examine repeated small opportunities. Fifty identical oversized boot disks may justify a template correction even when one disk would not justify a maintenance task. Rightsizing Explorer groups already-generated recommendations, so generation-time preferences can remove opportunities before grouping. [Rightsizing Explorer](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=cloudability-rightsizing-explorer)

Record each preference decision in plain language: “Keep architecture stable until the platform build supports the target,” or “Review same-family options first while this reservation expires.” Add a review date so temporary constraints do not become permanent blind spots.

## Conclusion

Good preferences narrow recommendations to plausible options. Commitment eligibility, application compatibility, complete utilization evidence, and measured rollout results still determine whether an individual change is worth making.
