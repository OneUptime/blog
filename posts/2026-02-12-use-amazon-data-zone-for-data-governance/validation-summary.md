# Validation Summary: How to Use Amazon DataZone for Data Governance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DataZone
- AWS CLI
- AWS IAM
- IAM Identity Center
- AWS Glue Data Catalog
- Amazon Athena
- AWS CloudTrail
- Amazon CloudWatch

## Sources Consulted
- Amazon DataZone terminology and concepts: https://docs.aws.amazon.com/datazone/latest/userguide/datazone-concepts.html
- AWS CLI `datazone create-domain`: https://docs.aws.amazon.com/cli/latest/reference/datazone/create-domain.html
- AWS CLI `datazone update-domain`: https://docs.aws.amazon.com/cli/latest/reference/datazone/update-domain.html
- AmazonDataZoneDomainExecutionRole: https://docs.aws.amazon.com/datazone/latest/userguide/AmazonDataZoneDomainExecutionRole.html
- AmazonDataZoneDomainExecutionRolePolicy: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonDataZoneDomainExecutionRolePolicy.html
- AWS CLI `datazone create-project-membership`: https://docs.aws.amazon.com/cli/latest/reference/datazone/create-project-membership.html
- AWS CLI `datazone create-environment`: https://docs.aws.amazon.com/cli/latest/reference/datazone/create-environment.html
- AWS CLI `datazone create-glossary`: https://docs.aws.amazon.com/cli/latest/reference/datazone/create-glossary.html
- AWS CLI `datazone create-glossary-term`: https://docs.aws.amazon.com/cli/latest/reference/datazone/create-glossary-term.html
- AWS CLI `datazone create-data-source`: https://docs.aws.amazon.com/cli/latest/reference/datazone/create-data-source.html
- AWS CLI `datazone start-data-source-run`: https://docs.aws.amazon.com/cli/latest/reference/datazone/start-data-source-run.html
- AWS CLI `datazone create-subscription-request`: https://docs.aws.amazon.com/cli/latest/reference/datazone/create-subscription-request.html
- AWS CLI `datazone accept-subscription-request`: https://docs.aws.amazon.com/cli/latest/reference/datazone/accept-subscription-request.html
- AWS CLI `datazone search`: https://docs.aws.amazon.com/cli/latest/reference/datazone/search.html
- AWS CLI `datazone list-subscriptions`: https://docs.aws.amazon.com/cli/latest/reference/datazone/list-subscriptions.html
- AWS CLI `datazone list-subscription-requests`: https://docs.aws.amazon.com/cli/latest/reference/datazone/list-subscription-requests.html
- Logging Amazon DataZone API calls using AWS CloudTrail: https://docs.aws.amazon.com/datazone/latest/userguide/logging-using-cloudtrail.html

## Issues Found
- The domain execution role trust policy omitted `sts:TagSession` and the `datazone*` tag key condition used by the default Amazon DataZone domain execution role. Updated the trust policy to match AWS documentation more closely.
- The text implied a manually created execution role was always required. Updated it to note that DataZone can create the default execution role, while still showing how to create one explicitly.
- The environment example used a display-like value, `DefaultDataLake`, for `--environment-profile-identifier`. Updated it to an ID-style placeholder and aligned the example environment with the producing project used later by the data source.
- The data source example imported Glue metadata but did not publish imported assets to the catalog, even though the section says it publishes data assets. Added `--publish-on-import` and updated the run comment accordingly.
- The CloudTrail statement was too broad because CloudTrail records Amazon DataZone API calls, not necessarily every underlying data read. Reworded it to refer specifically to DataZone API calls such as access requests, approvals, and subscription changes.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI validation was performed against the current official AWS CLI command reference and Amazon DataZone documentation. The examples still use placeholder IDs and ARNs that readers must replace with real values from their AWS account and DataZone domain.
