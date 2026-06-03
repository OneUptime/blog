# Validation Summary: How to Use AWS Health Dashboard for Service Status

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- AWS Health Dashboard
- AWS Health API
- AWS CLI
- Amazon EventBridge
- Amazon SNS
- AWS Lambda
- Amazon EC2
- AWS Organizations
- Python / boto3
- Slack incoming webhooks

## Sources Consulted
- AWS Health User Guide: What is AWS Health? https://docs.aws.amazon.com/health/latest/ug/what-is-aws-health.html
- AWS Health User Guide: Getting started with your AWS Health Dashboard https://docs.aws.amazon.com/health/latest/ug/getting-started-health-dashboard.html
- AWS Health User Guide: Viewing your account events in the AWS Health Dashboard https://docs.aws.amazon.com/health/latest/ug/aws-health-account-views.html
- AWS Health User Guide: AWS Health Dashboard - Service health https://docs.aws.amazon.com/health/latest/ug/aws-health-dashboard-status.html
- AWS Health API Reference: Welcome / endpoint and support-plan requirements https://docs.aws.amazon.com/health/latest/APIReference/Welcome.html
- AWS Health User Guide: Integrating AWS Health with other systems using the AWS Health API https://docs.aws.amazon.com/health/latest/ug/health-api.html
- AWS CLI Command Reference: health describe-events https://docs.aws.amazon.com/cli/latest/reference/health/describe-events.html
- AWS Health API Reference: EventFilter https://docs.aws.amazon.com/health/latest/APIReference/API_EventFilter.html
- AWS Health API Reference: OrganizationEventFilter https://docs.aws.amazon.com/health/latest/APIReference/API_OrganizationEventFilter.html
- AWS Health API Reference: OrganizationEvent https://docs.aws.amazon.com/health/latest/APIReference/API_OrganizationEvent.html
- Amazon EventBridge Reference: AWS Health events https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-health.html
- AWS Health User Guide: AWS Health events Amazon EventBridge schema https://docs.aws.amazon.com/health/latest/ug/aws-health-events-eventbridge-schema.html
- Amazon EventBridge User Guide: Event bus targets and permissions https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- AWS CLI Command Reference: events put-targets https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- Amazon EC2 User Guide: Manage instances scheduled to stop or retire https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/schedevents_actions_retire.html
- Amazon EC2 User Guide: Stop and start Amazon EC2 instances https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html
- Python documentation: datetime https://docs.python.org/3/library/datetime.html

## Issues Found
- Updated outdated dashboard terminology and URLs from Service Health Dashboard / Personal Health Dashboard / `phd.aws.amazon.com` to current AWS Health Dashboard Service health and Your account health pages.
- Corrected the Health API access statement. AWS now documents Business Support+, Enterprise Support, and Unified Operations access, with Business, Enterprise On-Ramp, and Enterprise Support still applying for regions or accounts not transitioned to the newer plans. Also clarified the active/passive endpoint model.
- Corrected the event categories explanation. Account-specific and public are event scopes, while organization events are an organization view, not an event type category.
- Added the missing EventBridge-to-SNS resource policy caveat. `put-targets` alone does not grant EventBridge permission to publish to an SNS topic in CLI/SDK workflows.
- Fixed the EC2 automation Lambda to avoid a `TypeError` when `eventTypeCode` is absent, use `detail.eventRegion`, and handle affected entity values that arrive as EC2 instance ARNs.
- Fixed the organization query to use `affectedAccounts` instead of nonexistent `awsAccountId` on `DescribeEventsForOrganization` summaries.
- Fixed the Slack Lambda to use `detail.eventRegion` and avoid an index error if `eventDescription` is missing or empty.
- Replaced `datetime.utcnow()` with timezone-aware `datetime.now(timezone.utc)` because `utcnow()` is deprecated in current Python.

## Review Notes
The AWS CLI is not installed in this workspace, so command validation was performed against official AWS CLI and API documentation rather than local `aws --help` output. Python snippets were parsed locally with `ast.parse` and all passed syntax validation.
