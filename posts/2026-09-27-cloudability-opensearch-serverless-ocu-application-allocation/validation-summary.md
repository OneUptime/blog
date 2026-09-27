# Validation Summary: How to Allocate OpenSearch Serverless OCU Costs by Application in Cloudability

## Status
validated

## Post Type
Technical guide with an executable Python allocation example.

## Technologies Covered
- Amazon OpenSearch Serverless collections, collection groups, and OpenSearch Compute Units (OCUs)
- AWS KMS, resource tags, and Amazon CloudWatch metrics
- IBM Cloudability Business Dimensions, Cost Sharing, cost metrics, and telemetry uploads
- Python 3 and the standard-library decimal module
- FinOps cost allocation and reconciliation

## Sources Consulted
- AWS collection groups: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-collection-groups.html
- AWS capacity limits and Classic collections: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-scaling.html
- AWS Serverless CloudWatch metrics and dimensions: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/monitoring-cloudwatch.html
- AWS collection tagging: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/tag-collection.html
- IBM Cost Sharing: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=setup-sharing-cost-in-cloudability
- IBM Premium Cost Sharing: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=setup-sharing-cost-in-cloudability
- IBM Premium release notes, including Centralized Telemetry and Datadog Metrics Integration, July 1, 2026: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=cloudability-whats-new-in-premium
- IBM Standard release notes corroborating the telemetry release: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=cloudability-whats-new-in
- IBM legacy Cost Sharing Telemetry API and CSV specifications: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=points-cost-sharing-telemetry
- IBM cost dimensions and metrics glossary: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=reference-glossary-cost-dimensions-metrics
- IBM explanation of amortized cost: https://www.ibm.com/support/pages/node/7283570
- Python decimal documentation: https://docs.python.org/3/library/decimal.html

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post contains technical implementation guidance and runnable code, so it qualifies for technical validation.
- Confirmed that collection groups share compute across collections with different KMS keys. AWS separately documents account-level capacity settings and same-key sharing for Classic collections outside groups. The post correctly avoids treating KMS keys as a universal allocation boundary.
- Confirmed account-level and collection-group variants of IndexingOCU and SearchOCU. Collection request and document metrics provide separate signals; they do not establish exact application compute costs. The distinction between ownership metadata, billing evidence, and allocation policy is sound.
- IBM documents fixed-weight and telemetry-based allocation within a business mapping. Its documentation differs in how it describes telemetry edition eligibility, so the post appropriately requires checking the tenant and edition rather than promising universal availability.
- Confirmed the July 1, 2026 centralized telemetry release and its date, tags, and value CSV layout. Legacy telemetry documentation instead describes date, business-dimension, and metric columns, including nonnegative metric values. Using the active workflow's template is appropriate.
- Executed the exact Python block using Python 3.13.1. Both original assertions passed. Payments received 144.00, Analytics 72.00, and Support 24.00, totaling 240.00. Decimal construction and arithmetic use supported standard-library functionality.
- The example is correctly labeled an arithmetic fixture. General weights can produce repeating decimal results, so a production allocator would need an explicit residual policy; the post already calls for handling rounding residuals. There are no terminal commands, API calls, or configuration snippets to execute.
- Consistent cost basis, separate indexing and search policies, protection against overlapping allocations, and preservation of unallocated spend are valid accounting controls. Amortized and invoice-oriented metrics should not be mixed during reconciliation.
- Documentation links identify the intended official resources. Some IBM pages returned HTTP 403 through the browsing tool; indexed official documentation supplied their content, and the linked Premium release page was also retrieved directly over HTTPS to confirm its release notes.
- No live AWS billing export, telemetry dataset, or Cloudability tenant was supplied. Validation covers the documented capabilities and local arithmetic, not an end-to-end tenant allocation or reconciliation of actual charges.
