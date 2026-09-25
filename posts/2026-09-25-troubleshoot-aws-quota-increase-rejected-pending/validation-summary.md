# Validation Summary: How to Troubleshoot Rejected or Pending AWS Service Quota Increases

## Status
validated

## Post Type
Technical troubleshooting guide with AWS CLI examples.

## Technologies Covered
- AWS Service Quotas and AWS Support request processing
- AWS CLI, Bash, and JMESPath response queries
- AWS STS, IAM, and organizational access controls
- Amazon EC2 quotas, resource context, and capacity troubleshooting

## Sources Consulted
- [GetRequestedServiceQuotaChange API](https://docs.aws.amazon.com/servicequotas/2019-06-24/apireference/API_GetRequestedServiceQuotaChange.html)
- [RequestedServiceQuotaChange fields and states](https://docs.aws.amazon.com/servicequotas/2019-06-24/apireference/API_RequestedServiceQuotaChange.html)
- [RequestServiceQuotaIncrease API parameters and errors](https://docs.aws.amazon.com/servicequotas/2019-06-24/apireference/API_RequestServiceQuotaIncrease.html)
- [Requesting a quota increase](https://docs.aws.amazon.com/servicequotas/latest/userguide/request-quota-increase.html)
- [CLI get-requested-service-quota-change](https://docs.aws.amazon.com/cli/latest/reference/service-quotas/get-requested-service-quota-change.html)
- [CLI list-requested-service-quota-change-history-by-quota](https://docs.aws.amazon.com/cli/latest/reference/service-quotas/list-requested-service-quota-change-history-by-quota.html)
- [CLI get-service-quota](https://docs.aws.amazon.com/cli/latest/reference/service-quotas/get-service-quota.html)
- [CLI STS get-caller-identity](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
- [Service Quotas terminology, global scope, and CLI requirements](https://docs.aws.amazon.com/servicequotas/latest/userguide/intro.html)
- [AWS CLI retries](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-retries.html)
- [IAM access-denied troubleshooting](https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_access-denied.html)
- [EC2 instance launch troubleshooting](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/troubleshooting-launch.html)
- [Author profile](https://github.com/nawazdhandala) — checked the original author link and its redirect.

## Issues Found
- The history lookup omitted `--quota-requested-at-level`, which defaults to `ACCOUNT`. That could hide a resource-level request despite the instruction to match resource context. Added `--quota-requested-at-level ALL` and explained the filter so the lookup includes both levels.
- The generic troubleshooting instructions used fixed EC2 service and quota codes without explicitly identifying them as examples. Clarified that readers must substitute their request's codes, preventing history and applied-value checks against an unrelated quota.

## Review Notes
- Verified all four CLI invocations, their options, response field names, and both JMESPath projections against official CLI/API documentation. Checked Bash syntax for all three command blocks without executing AWS requests.
- Confirmed all seven request-state enum values, including the distinction between case closure and approval and the invalid resource ARN meaning of `INVALID_REQUEST`. AWS prose sometimes uses spaces in “Not approved,” while the API enum is `NOT_APPROVED`.
- Confirmed `SupportCaseAllowed` defaults to true, false prevents support case creation, and `DesiredValue` specifies the new total rather than an increment. The submission error names and troubleshooting guidance are consistent with AWS documentation.
- Confirmed resource-specific retrieval accepts `--context-id`. The example EC2 quota code identifies the standard On-Demand instance vCPU quota; readers must retain their original account, Region, quota, and resource context.
- Global quotas are account-wide; their request Region depends on the AWS partition. The article correctly avoids treating Regions as independent global entitlements.
- Approval timing is not guaranteed, and AWS may partially approve a request. Comparing the applied value with the decision, as the article recommends, remains appropriate. Some quotas do not expose an applied value through `get-service-quota`; lack of a returned value should not be treated as proof of denial.
- AWS documents CLI version 2.13.20 or newer for resource-level quota management. No deprecated API or option was identified in the examples.
- Confirmed that physical capacity shortages, other exhausted quotas, and API throttling can remain after a quota increase. Deployment sizing and phased-growth advice are operational recommendations, not promises of AWS approval.
- All original external links resolved to their intended documentation or author profile. No configuration snippets or explicit software-version claims required correction.
- Validation was based on official documentation and local syntax checks; no authenticated AWS calls, quota submissions, or deployment tests were performed.
