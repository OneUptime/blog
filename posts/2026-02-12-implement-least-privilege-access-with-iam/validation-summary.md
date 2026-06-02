# Validation Summary: How to Implement Least Privilege Access with IAM

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- IAM policies, managed policies, permission boundaries, and conditions
- IAM Access Analyzer
- AWS CloudTrail and CloudTrail Lake
- AWS CLI
- Repokid

## Sources Consulted
- AWS IAM User Guide: IAM Access Analyzer policy generation - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html
- AWS CLI Command Reference: accessanalyzer start-policy-generation - https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/start-policy-generation.html
- AWS CLI Command Reference: accessanalyzer get-generated-policy - https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/get-generated-policy.html
- AWS IAM User Guide: AWS managed policies for job functions - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_job-functions.html
- AWS IAM User Guide: Service Authorization Reference - https://docs.aws.amazon.com/service-authorization/latest/reference/
- AWS IAM User Guide: IAM JSON policy elements, Condition - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html
- AWS IAM User Guide: IAM JSON policy elements, NotAction - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_notaction.html
- AWS IAM User Guide: Permissions boundaries for IAM entities - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS CloudTrail User Guide: CloudTrail Lake queries - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-lake-queries.html
- AWS CloudTrail User Guide: CloudTrail Lake SQL constraints - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/query-limitations.html
- AWS CloudTrail User Guide: Run and manage CloudTrail Lake queries with the AWS CLI - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/lake-queries-cli.html
- AWS CLI Command Reference: iam list-policies - https://docs.aws.amazon.com/cli/latest/reference/iam/list-policies.html
- AWS CLI Command Reference: iam get-credential-report - https://docs.aws.amazon.com/cli/latest/reference/iam/get-credential-report.html
- AWS CLI Command Reference: accessanalyzer list-findings and list-findings-v2 - https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/list-findings.html
- IAM Access Analyzer API Reference: ListFindingsV2 - https://docs.aws.amazon.com/access-analyzer/latest/APIReference/API_ListFindingsV2.html

## Issues Found
- The Access Analyzer command used `aws accessanalyzer generate-policy`, which is not a valid AWS CLI command. Changed it to `aws accessanalyzer start-policy-generation` and added the follow-up `get-generated-policy --job-id <job-id>` retrieval command because policy generation is an asynchronous job.
- The description said the command directly generated a policy. Updated it to say it starts a policy generation job, matching the AWS CLI behavior.
- The CloudTrail Lake section did not mention the current availability caveat. Updated the sentence to clarify that CloudTrail Lake querying applies to existing CloudTrail Lake customers because AWS states CloudTrail Lake is no longer open to new customers starting May 31, 2026.
- The CloudTrail Lake query used `FROM cloudtrail_logs`, but CloudTrail Lake queries use an event data store ID in the `FROM` clause. Changed it to `FROM event_data_store_ID`.
- The unused permissions monitoring command used `list-findings`, which AWS documents as supported only for external access analyzers. Changed it to `list-findings-v2` with an unused access analyzer ARN variable.

## Review Notes
The remaining IAM policy snippets are syntactically valid JSON policy examples. Some examples intentionally use broad `"Resource": "*"` access as teaching examples; in production, the author already instructs readers to scope resources and review generated policies before attaching them.
