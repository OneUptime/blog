# Validation Summary: How to Set Up AWS Resilience Hub for Application Resilience

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Resilience Hub
- AWS Fault Injection Service
- AWS CLI
- Amazon RDS
- Amazon EC2
- Amazon CloudWatch alarms
- Boto3 for Python
- AWS Systems Manager runbooks

## Sources Consulted
- AWS CLI Command Reference: create-app - https://docs.aws.amazon.com/cli/latest/reference/resiliencehub/create-app.html
- AWS CLI Command Reference: import-resources-to-draft-app-version - https://docs.aws.amazon.com/cli/latest/reference/resiliencehub/import-resources-to-draft-app-version.html
- AWS CLI Command Reference: create-app-version-resource - https://docs.aws.amazon.com/cli/latest/reference/resiliencehub/create-app-version-resource.html
- AWS CLI Command Reference: create-resiliency-policy - https://docs.aws.amazon.com/cli/latest/reference/resiliencehub/create-resiliency-policy.html
- AWS CLI Command Reference: update-app - https://docs.aws.amazon.com/cli/latest/reference/resiliencehub/update-app.html
- AWS CLI Command Reference: publish-app-version - https://docs.aws.amazon.com/cli/latest/reference/resiliencehub/publish-app-version.html
- AWS CLI Command Reference: start-app-assessment - https://docs.aws.amazon.com/cli/latest/reference/resiliencehub/start-app-assessment.html
- AWS CLI Command Reference: describe-app-assessment - https://docs.aws.amazon.com/cli/latest/reference/resiliencehub/describe-app-assessment.html
- AWS CLI Command Reference: list-app-assessment-compliance-drifts - https://docs.aws.amazon.com/cli/latest/reference/resiliencehub/list-app-assessment-compliance-drifts.html
- AWS CLI Command Reference: list-recommendation-templates - https://docs.aws.amazon.com/cli/latest/reference/resiliencehub/list-recommendation-templates.html
- AWS CLI Command Reference: create-recommendation-template - https://docs.aws.amazon.com/cli/latest/reference/resiliencehub/create-recommendation-template.html
- AWS CLI Command Reference: create-experiment-template - https://docs.aws.amazon.com/cli/latest/reference/fis/create-experiment-template.html
- AWS FIS User Guide: Stop conditions - https://docs.aws.amazon.com/fis/latest/userguide/stop-conditions.html
- AWS FIS User Guide: Actions reference - https://docs.aws.amazon.com/fis/latest/userguide/fis-actions-reference.html
- Boto3 ResilienceHub list_app_assessments - https://docs.aws.amazon.com/boto3/latest/reference/services/resiliencehub/client/list_app_assessments.html
- Boto3 ResilienceHub describe_app_assessment - https://docs.aws.amazon.com/boto3/latest/reference/services/resiliencehub/client/describe_app_assessment.html
- OneUptime linked article check - https://oneuptime.com/blog/post/2026-02-12-run-well-architected-review-with-aws/view

## Issues Found
- The `create-app` example used `--app-assessment-schedule`, which is not a valid AWS CLI option. Changed it to `--assessment-schedule`.
- Example ARNs used a 9-digit account ID. Changed them to use a valid 12-digit example account ID.
- The manual resource import example used `import-resources-to-draft-app-version` with individual EC2, RDS, and load balancer ARNs. Replaced it with `create-app-version-resource`, which is the documented CLI command for manually adding a resource to a Resilience Hub draft app version.
- The FIS stop condition explanation said instances are restored when the alarm triggers. AWS FIS stop conditions stop the experiment; instance restart behavior comes from the `startInstancesAfterDuration` parameter. Updated the explanation accordingly.
- The recommendation template example used invalid `--recommendation-types` values `SopRecommendation` and `TestRecommendation`. Changed them to the documented enum values `Sop` and `Test`.
- The boto3 `list_app_assessments` call passed `assessmentStatus` as a string, but boto3 expects a list. Changed it to `['Success']`.
- The boto3 example claimed `achievableRtoInSecs` was the policy target. Changed the code to read the target RTO from `detail['assessment']['policy']['policy']`.
- The boto3 example said it fetched the latest assessment but did not request descending order. Added `reverseOrder=True`.

## Review Notes
AWS CLI was not installed in the local environment, so command validation was performed against the current official AWS CLI and AWS API documentation rather than local `aws --help` output.
