# Validation Summary: Diagnose an Unexpected Cloud Run Bill

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Google Cloud Run
- Cloud Billing Reports
- Google Cloud CLI (`gcloud`)
- Cloud Run request-based and instance-based billing
- Cloud Run minimum instances and concurrency
- Cloud Monitoring
- Serverless VPC Access, Cloud NAT, and Cloud Load Balancing
- Cloud Build, Artifact Registry, and Cloud Logging

## Sources Consulted

- [Analyze billing data and cost trends with Reports](https://docs.cloud.google.com/billing/docs/how-to/reports)
- [Billing reports: View the charges on your invoices](https://docs.cloud.google.com/billing/docs/how-to/reports/charges-on-invoices)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Cloud Run billing settings for services](https://docs.cloud.google.com/run/docs/configuring/billing-settings)
- [Set minimum instances for services](https://docs.cloud.google.com/run/docs/configuring/min-instances)
- [`gcloud run services describe` reference](https://docs.cloud.google.com/sdk/gcloud/reference/run/services/describe)
- [Maximum concurrent requests for Cloud Run services](https://docs.cloud.google.com/run/docs/about-concurrency)
- [Send serverless traffic to a VPC network](https://docs.cloud.google.com/vpc/docs/serverless-vpc-access)
- [Virtual Private Cloud pricing](https://cloud.google.com/vpc/pricing)

## Issues Found

No technical issues found.

## Review Notes

The resource-time equations are correctly presented as approximations rather than invoice calculators. For request-based billing, minimum instances can accrue separately priced idle time, while instance-based billing covers the full instance lifecycle; the post appropriately instructs readers to apply the billing mode and applicable pricing rules. Cloud Run budget spend caps are currently a Preview feature and do not cover every adjacent product, such as the Compute Engine VMs underlying Serverless VPC Access connectors; the post correctly advises checking scope and availability and warns that a budget alert alone is not an enforcement mechanism.
