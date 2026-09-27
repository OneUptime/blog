# Validation Summary: Cloudability Rightsizing: Preserve Commitments and CPU Compatibility

## Status
validated

## Post Type
Technical configuration and operational review guide. The post contains concrete UI configuration details and explanations of recommendation behavior, so it warrants technical validation even though it has no executable code, commands, or configuration snippets.

## Technologies Covered
- IBM Cloudability Basic rightsizing preferences and Rightsizing Explorer
- Cloudability Premium Advanced rightsizing powered by IBM Turbonomic
- AWS EC2, Reserved Instances, and Savings Plans
- CPU architecture compatibility, Arm64/Graviton, and container images
- Utilization metrics, amortized commitment costs, and custom pricing

## Sources Consulted
- [IBM Cloudability Rightsizing Preferences](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=ar-rightsizing-preferences) — Basic settings, generation/family constraints, processor options, missing-metric capacity reductions, and savings thresholds.
- [IBM Advanced rightsizing preferences](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=rightsizing-advanced-preferences) — navigation and independence of the Basic and Advanced engines.
- [IBM Rightsizing FAQ](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=rightsizing-faq) — On-Demand versus Effective calculations and custom pricing.
- [IBM Custom Discounts and Enterprise Discount Programs](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=support-custom-discounts-enterprise-discount-programs-edp) — custom rates apply to both cost bases.
- [IBM Rightsizing Explorer](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=cloudability-rightsizing-explorer) — grouping occurs after generation-time preferences, including the disk-template use case.
- [IBM Rightsizing](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=optimize-rightsizing) — utilization-based recommendations and the need for workload-specific due diligence.
- [AWS Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html) — Compute Savings Plans flexibility versus family- and Region-specific EC2 Instance Savings Plans.
- [AWS How Reserved Instance discounts are applied](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/apply_ri.html) — eligibility attributes and limits of instance-size flexibility.
- [AWS Graviton Getting Started Guide](https://aws.amazon.com/ec2/graviton/getting-started/) — compatible images, dependencies, and workload migration preparation.
- [AWS Containers on Graviton](https://aws.github.io/graviton/containers.html) — architecture-specific images and dependency compatibility.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged; no technical corrections were necessary.
- Confirmed that the Basic preferences apply globally to Cloudability-generated recommendations and are separate from Turbonomic policy settings.
- Confirmed that family restrictions can help preserve commitment eligibility but do not guarantee coverage. AWS commitment products differ in their flexibility and matching requirements.
- Verified the illustrative arithmetic: 100 minus 80 equals 20 in on-demand savings; 65 minus 80 equals negative 15 using the stated effective comparison. The example assumes equivalent periods and usage. It is a hypothetical comparison, not a claim that Cloudability necessarily displays a negative-savings recommendation or that the invoice rises by exactly that amount.
- Confirmed the processor controls and missing-utilization capacity-reduction behavior. The compatibility table and load-testing guidance describe engineering review responsibilities, not automated application certification by Cloudability.
- IBM documents the compute savings threshold as a minimum 30-day savings amount. The post correctly asks readers to verify the savings period; naming that period would be an optional clarification rather than a required correction.
- Confirmed that Explorer groups recommendations after preferences have already been applied, supporting the discussion of small grouped opportunities and template improvements.
- The linked IBM topics were found in official indexed documentation with matching titles and content. Direct retrieval initially returned HTTP 403 errors; the review used search-indexed official content where direct access was unavailable. This is an access limitation, not evidence that the links are broken.
- No version-pinned APIs, deprecated commands, or executable examples require runtime tests. This was a documentation review; no live Cloudability tenant, commitment portfolio, or application was tested.
