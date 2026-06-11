# Validation Summary: How to Create Cost-Capacity Trade-offs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- Mermaid diagrams
- Site reliability engineering availability targets
- AWS Reserved Instances
- AWS Savings Plans
- AWS Spot Instances
- Capacity planning and FinOps modeling

## Sources Consulted
- TypeScript Handbook: Everyday Types: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- Mermaid Quadrant Chart documentation: https://mermaid.js.org/syntax/quadrantChart.html
- Google SRE Availability Table: https://sre.google/sre-book/availability-table/
- Google Cloud SRE availability and error budget explanation: https://cloud.google.com/blog/products/gcp/available-or-not-that-is-the-question-cre-life-lessons
- AWS EC2 Reserved Instances overview: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html
- AWS Savings Plans overview: https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html
- AWS Compute Savings Plans and Reserved Instances: https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html
- AWS EC2 Spot Instances best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html

## Issues Found
- The Cost-Reliability Matrix labeled Mermaid `quadrant-4` as "Cost-efficient", but Mermaid defines quadrant 4 as the bottom-right quadrant. With the post's axes, that means high cost and low reliability. Changed the quadrant label and table row to "Inefficient" with high cost and low reliability.
- The utilization target example output said `monthsUntilResize: -6`, but the TypeScript calculation returns `-7` because `Math.floor()` rounds the negative value down. Updated the example output.
- The reliability cost model used a 30-day month while the surrounding downtime table used average-month values based on 730 hours. Updated the model to use `730 * 60` minutes and corrected the example output values.
- The Reserved Instance calculator computed a break-even period from an implied upfront payment without accepting upfront cost as an input. Added an optional `reservedUpfrontCost3yr` field and made break-even calculation conditional on that value.
- The over-provisioning example output did not match the code's rounded results. Updated `totalMonthlyCost` to `1545` and `wastedMonthlyCost` to `618`.
- The under-provisioning example output rounded `expectedMonthlyCost` incorrectly. Updated it from `669250` to `669167`.

## Review Notes
The TypeScript snippets were extracted and checked with `tsc --noEmit` using TypeScript 5.9.3, then executed with `tsx` to verify the example outputs that are deterministic. The reservation calculator uses randomized sample usage, so its printed values are intentionally illustrative rather than fixed.
