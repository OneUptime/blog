# Validation Summary: How to Calculate ROI of Adopting Dapr

## Status
validated

## Post Type
Guide / Decision Framework

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Helm (for Dapr installation/upgrade)
- Kubernetes (implied runtime platform)
- grep (CLI tool for codebase analysis)
- Cloud cost estimation (AWS-style pricing model)

## Sources Consulted
- Dapr Helm chart installation documentation (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/)
- Dapr sidecar resource configuration documentation (https://docs.dapr.io/operations/configuration/increase-request-size/)
- AWS EC2 on-demand pricing for general-purpose instances (used as reference for cloud cost estimates)
- GNU grep manual for BRE alternation syntax

## Issues Found
- **Initial implementation cost total did not match itemized breakdown.** The post listed individual cost items (initial setup: 1-2, first service migration: 2-5, team learning: 1-2 days × 5 engineers = 5-10, documentation: 1 day) which sum to 9-18 engineer-days, but the stated total was "~15-25 engineer-days for a team of 5." Fixed the total to "~9-18 engineer-days for a team of 5" to match the itemized costs. The ROI calculation section uses $12,000 for setup (implying ~15 engineer-days at $800/day), which is within the corrected range and serves as a conservative mid-to-high estimate for the illustrative calculation.

## Review Notes
- The `session.NewSession` in the grep example refers to AWS SDK v1, which has been superseded by AWS SDK v2 (`config.LoadDefaultConfig`). This is acceptable since it's used as an illustrative search pattern to find infrastructure client code, not as a recommendation.
- Cloud pricing figures ($0.048/vCPU-hour, $0.006/GB-hour) are illustrative and roughly align with AWS on-demand pricing, but will vary by provider, region, and instance type. The post appropriately notes "Adjust for your cloud provider's pricing."
- All other arithmetic (resource costs, dev savings, incident reduction, migration savings, Year 1 and Year 2+ ROI calculations, and ROI percentages) verified correct.
