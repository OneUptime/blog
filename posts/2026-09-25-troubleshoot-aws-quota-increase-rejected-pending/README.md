# How to Troubleshoot an AWS Service Quota Increase That Is Rejected or Stuck Pending

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Service Quotas, Troubleshooting

Description: Diagnose AWS quota request states, missing support cases, incorrect resource context, and approval propagation without repeatedly submitting the same request.

---

A submitted quota request is not an applied quota increase. A support case marked closed is not necessarily an approval, and an API call that fails authorization has not created a request at all. These distinctions determine whether to wait, correct the request, or change the deployment plan.

Use the original request ID and the same AWS account and region as the submission. Do not start by repeatedly requesting the same value.

## Retrieve the complete request record

```bash
region=eu-west-1
request_id=replace-with-request-id
aws sts get-caller-identity
aws service-quotas get-requested-service-quota-change \
  --region "$region" --request-id "$request_id" \
  --query 'RequestedQuota.{Id:Id,Status:Status,Service:ServiceCode,Quota:QuotaCode,Desired:DesiredValue,Created:Created,Updated:LastUpdated,Case:CaseId,Context:QuotaContext}' \
  --output json
```

The [GetRequestedServiceQuotaChange API](https://docs.aws.amazon.com/servicequotas/2019-06-24/apireference/API_GetRequestedServiceQuotaChange.html) returns the request's status and context. Save the full response as restricted operational evidence if more fields are needed. If the lookup fails, inspect the error rather than converting it into “still pending.” A wrong account, region, ID, or permission can all invalidate that conclusion.

If the ID was lost, list request history for the specific service and quota:

```bash
aws service-quotas list-requested-service-quota-change-history-by-quota \
  --service-code ec2 --quota-code L-1216C47A --region "$region" \
  --output json
```

Match the desired value, submission time, and resource context. Keep CLI pagination enabled so an older request is not accidentally omitted.

## Interpret the state before choosing an action

The [request-state reference](https://docs.aws.amazon.com/servicequotas/2019-06-24/apireference/API_RequestedServiceQuotaChange.html) defines these API values:

| State | Investigation |
| --- | --- |
| `PENDING` | AWS is reviewing the request; inspect timestamps and the intended scope |
| `CASE_OPENED` | Open the associated support case and check correspondence |
| `APPROVED` | Verify the applied quota value before deployment |
| `DENIED` | Read the decision and address its stated reason |
| `NOT_APPROVED` | Service Quotas could not approve it; inspect support-case settings and contact AWS Support for details |
| `CASE_CLOSED` | Read the case outcome; closure alone does not say whether the increase was granted |
| `INVALID_REQUEST` | Check the resource ARN supplied through `ContextId` |

Console labels can differ from API enum strings. Record the underlying state if an automation branches on it, and treat an unknown future state as requiring review rather than success.

Do not assume a fixed approval deadline. Track the request against the launch date and the service's current process, and use the existing case when follow-up is needed.

## Check whether automation disabled support escalation

The [RequestServiceQuotaIncrease API](https://docs.aws.amazon.com/servicequotas/2019-06-24/apireference/API_RequestServiceQuotaIncrease.html) supports `SupportCaseAllowed`. Its default permits AWS to create a support case where needed. Setting it to false can leave the request not approved when automatic handling cannot complete it.

Inspect the original command, SDK parameters, or audit record for this setting. Do not blame the quota value alone if the request intentionally prevented the next processing step. Correct the workflow using the service's documented process and keep the old request ID linked to any replacement submission.

Also verify that `DesiredValue` means the new total ceiling. A request for twenty more vCPUs is represented differently from a request for a total of twenty vCPUs; the API expects the increased total value.

## Separate submission errors from review outcomes

An `AccessDeniedException` requires checking IAM permissions and organizational controls. `NoSuchResourceException` points toward the service, quota, or context being wrong or unavailable. `ResourceAlreadyExistsException` can indicate an existing request; inspect history before submitting again. API throttling calls for bounded retries and lower request frequency, not a larger deployment-resource quota.

For resource-level quotas, use the correct ARN and account-level versus resource-level operation described in the [request guide](https://docs.aws.amazon.com/servicequotas/latest/userguide/request-quota-increase.html). A global quota also requires the service's correct global scope; switching arbitrary regions does not create a new independent entitlement.

For a denied request, prepare a concrete deployment model: current applied ceiling, current use, expected peak, region, service, launch date, and phased growth. Respond to the reason in the decision. Avoid promising that any particular justification guarantees approval.

## Close the loop on the actual applied value

After an apparent approval, fetch the quota again:

```bash
aws service-quotas get-service-quota \
  --service-code ec2 --quota-code L-1216C47A --region "$region" \
  --query 'Quota.{Name:QuotaName,Applied:Value,Unit:Unit}' --output json
```

If the request is resource-specific, query the matching context as documented. If the applied ceiling still does not match the decision, retain both records and follow up on that discrepancy. Do not create a loop that keeps requesting the same increase.

Finally, recalculate demand and retry the relevant deployment step. A sufficient quota can still coexist with unavailable physical capacity, a different exhausted quota, or API throttling. The investigation is complete when the approved scope and applied value support the planned allocation and the deployment's remaining error, if any, is correctly classified.
