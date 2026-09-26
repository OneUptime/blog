# Validation Summary: Reconcile Cloudability Amortized AWS Costs with CUR, RIs, and Savings Plans

## Status
validated

## Post Type
Technical reconciliation guide. The CUR field mappings, commitment arithmetic, and account attribution controls are technical implementation details, even though the post contains no executable code.

## Technologies Covered
- IBM Cloudability Cost (Amortized) and Cost (Adjusted Amortized)
- AWS Cost and Usage Report (CUR)
- AWS Reserved Instances (RIs)
- AWS Savings Plans
- Amazon Athena column naming
- FinOps cost reconciliation and commitment attribution

## Sources Consulted
- [AWS CUR line-item details](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html): charge types, unblended costs, account identifiers, and post-finalization adjustments.
- [AWS reservation details](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html): effective cost, unused upfront and recurring costs, reservation ARN, and service-specific field availability.
- [AWS Savings Plans details](https://docs.aws.amazon.com/cur/latest/userguide/savingsplans-columns.html): effective cost, total commitment, used commitment, and applicable line-item types.
- [AWS Understanding Savings Plans](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html): covered usage, negation, recurring fees, and upfront fees.
- [IBM Cloudability glossary of cost dimensions and metrics](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=reference-cloudability-glossary-cost-dimensions-metrics): amortized versus adjusted amortized metrics, custom pricing, report dimensions, and upfront commitment treatment.
- [IBM Understanding the Cost (Amortized) Metric in Cloudability](https://www.ibm.com/support/pages/node/7283570): AWS field-based amortization and attribution of consumed and unused commitments.
- [AWS Understanding your report versions](https://docs.aws.amazon.com/cur/latest/userguide/understanding-report-versions.html): report updates, versioning, and manifest files.
- [AWS What are AWS Cost and Usage Reports?](https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html): finalized reports can receive subsequent credits, refunds, and support fees.
- [AWS Running Amazon Athena queries](https://docs.aws.amazon.com/cur/latest/userguide/cur-ate-run.html): transformations of CUR column names for Athena.

## Issues Found
- **Commitment control compared with an overly broad payer total.** The ownership section said consumed account allocations plus unused owner residual should equal the payer total. Those components cover commitments only; the full payer total can also contain on-demand usage, unrelated fees, and adjustments. Changed the comparison to the payer’s amortized commitment subtotal for the same period and scope. This preserves the intended control without incorrectly implying that commitment costs explain the entire bill.

## Review Notes
- Confirmed the RI effective-cost components and unused-fee fields, along with the instruction to avoid counting the original upfront purchase again.
- Confirmed Savings Plans effective-cost and unused-commitment field mappings. The illustrative arithmetic is correct: $8 consumed plus $2 unused equals $10; adding the full $10 commitment to $8 consumed incorrectly produces $18.
- Confirmed Cloudability assigns consumed commitment costs to consuming accounts/resources and unused costs to the commitment holder. Excluding that holder can therefore exclude unused cost.
- Confirmed the distinction between ordinary amortized cost and configured custom-pricing adjustments. The article intentionally does not provide a universal query or a net-amortized calculation.
- The fenced blocks contain an accounting identity and worksheet columns, not executable code. There are no CLI commands, configuration files, API calls, or explicit software versions to test.
- The linked technical sources correspond to the cited topics. IBM’s glossary initially failed direct retrieval, but its contents were available through the search index at the same URL.
- Validation is documentation-based. No actual CUR dataset or Cloudability export was supplied, so tenant-specific totals, filters, allocations, and source freshness could not be tested.
