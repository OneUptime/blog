# Validation Summary: How to Create Cost Reviews

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- YAML
- Mermaid
- AWS Cost Explorer and Cost Anomaly Detection APIs
- Boto3
- Google Calendar API
- Jinja2
- Kubecost Allocation API
- SMTP email
- Jira Cloud REST API
- Pandas

## Sources Consulted
- AWS Billing and Cost Management API Reference: GetCostAndUsage: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html
- Boto3 Cost Explorer get_anomalies documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_anomalies.html
- Boto3 Cost Explorer get_rightsizing_recommendation documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_rightsizing_recommendation.html
- Boto3 Cost Explorer get_reservation_purchase_recommendation documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_reservation_purchase_recommendation.html
- Google Calendar API Events.insert documentation: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Jinja2 API documentation: https://jinja.palletsprojects.com/en/stable/api/
- Jira Cloud REST API issue creation documentation: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/
- Kubecost Allocation API documentation: https://docs.kubecost.com/apis/monitoring-apis/api-allocation

## Issues Found
- The Jinja2 agenda and documentation examples added the custom `format_currency` filter after constructing `Template(...)`. Jinja validates filters during template compilation, so this raises `TemplateAssertionError`. Changed both examples to create a Jinja `Environment`, register the filter, and then compile with `env.from_string(...)`.
- The AWS Cost Explorer data collection example used three `GroupBy` entries (`SERVICE`, `team`, and `environment`). `GetCostAndUsage` supports only up to two group definitions. Removed the third grouping and defaulted `environment` to `unknown` in that example.
- The rightsizing recommendation example read savings from a non-existent `RightsizingRecommendation.SavingsPercentage` path. Updated it to read documented savings fields from `TerminateRecommendationDetail.EstimatedMonthlySavings` or the default target in `ModifyRecommendationDetail.TargetInstances`.
- The Jira ticket payload used `assignee.name`, which is not valid for Jira Cloud issue creation. Updated the example to use an accountId-based assignment only after an explicit owner-email-to-accountId lookup.

## Review Notes
The examples are illustrative and still require real credentials, organization mappings, network access, and service-specific configuration before production use. The Google Calendar, AWS Cost Explorer, Cost Anomaly Detection, reservation recommendation, Kubecost allocation, YAML, Mermaid, and Python syntax reviewed as technically plausible after the targeted corrections.
