# How to Request AWS Service Quota Increases

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Service Quotas, Operations, Infrastructure

Description: Step-by-step guide to requesting AWS service quota increases through the console, CLI, and API, with tips for getting approvals faster.

---

You've hit a service quota limit. Maybe Lambda's 1,000 concurrent execution limit is throttling your API, or you need more than 5 VPCs in a region, or your auto-scaling group can't launch new instances because you've hit the EC2 limit. Whatever the case, you need to request an increase.

The process is straightforward, but there are tricks to getting your request approved faster. Let's walk through it.

## Check Your Current Quotas First

Before requesting an increase, verify which quota is actually the bottleneck:

```bash
# List quotas for a specific service with current values
aws service-quotas list-service-quotas \
  --service-code lambda \
  --query "Quotas[].{
    Name: QuotaName,
    Code: QuotaCode,
    Value: Value,
    Adjustable: Adjustable
  }" \
  --output table
```

Not all quotas are adjustable. Check the `Adjustable` field. If it's `false`, you can't request an increase - you'll need to work around the limit architecturally.

```bash
# Get details on a specific quota including whether it's adjustable
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-1216C47A \
  --query "Quota.{
    Name: QuotaName,
    Value: Value,
    Adjustable: Adjustable,
    GlobalQuota: GlobalQuota,
    Unit: Unit
  }"
```

## Requesting an Increase via CLI

The simplest way to request an increase:

```bash
# Request an increase for Lambda concurrent executions
aws service-quotas request-service-quota-increase \
  --service-code lambda \
  --quota-code L-B99A9384 \
  --desired-value 3000
```

```bash
# Request an increase for EC2 on-demand instances
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-1216C47A \
  --desired-value 500
```

```bash
# Request more VPCs per region
aws service-quotas request-service-quota-increase \
  --service-code vpc \
  --quota-code L-F678F1CE \
  --desired-value 20
```

## Tracking Your Request

After submitting, check the status:

```bash
# List all pending quota increase requests
aws service-quotas list-requested-service-quota-changes-in-history \
  --query "RequestedQuotas[].{
    Service: ServiceCode,
    QuotaName: QuotaName,
    Requested: DesiredValue,
    Status: Status,
    Created: Created
  }" \
  --output table
```

```bash
# Get details on a specific request
aws service-quotas get-requested-service-quota-change \
  --request-id request-id-here
```

Request statuses:
- **PENDING** - Request submitted, waiting for review
- **CASE_OPENED** - AWS Support case has been created
- **APPROVED** - Increase granted
- **DENIED** - Request denied (you'll get a reason)
- **CASE_CLOSED** - Associated support case was closed

## Requesting via Support Case

For quotas not yet available in the Service Quotas service, or when you need a faster response, create a support case directly:

```bash
# Create a support case for a quota increase
aws support create-case \
  --subject "Service Quota Increase: EC2 Running Instances" \
  --communication-body "Hello, I need to increase the EC2 on-demand running instance limit in us-east-1 from the current 256 to 500. We are scaling our production workload to handle increased traffic. Our current usage is approximately 200 instances during peak hours, and we expect to reach 400 within the next month. Account ID: 123456789012." \
  --service-code "amazon-elastic-compute-cloud-linux" \
  --category-code "instance-limit" \
  --severity-code "normal" \
  --language "en"
```

## Bulk Quota Requests

If you're setting up a new region or account and need multiple quotas increased, use a script:

```python
import boto3
import time

sq = boto3.client('service-quotas')

# Define all quota increases needed
quota_requests = [
    {'service': 'ec2', 'quota': 'L-1216C47A', 'value': 500, 'name': 'On-Demand Instances'},
    {'service': 'vpc', 'quota': 'L-F678F1CE', 'value': 20, 'name': 'VPCs per Region'},
    {'service': 'lambda', 'quota': 'L-B99A9384', 'value': 3000, 'name': 'Lambda Concurrency'},
    {'service': 'elasticloadbalancing', 'quota': 'L-53DA6B97', 'value': 100, 'name': 'ALBs per Region'},
    {'service': 'rds', 'quota': 'L-7B6409FD', 'value': 80, 'name': 'DB Instances'},
    {'service': 'ebs', 'quota': 'L-D18FCD1D', 'value': 50000, 'name': 'gp3 Volume Storage (TiB)'},
]

def request_quota_increases():
    """Submit quota increase requests in bulk"""
    results = []

    for req in quota_requests:
        try:
            # Check current value first
            current = sq.get_service_quota(
                ServiceCode=req['service'],
                QuotaCode=req['quota']
            )
            current_value = current['Quota']['Value']

            if current_value >= req['value']:
                print(f"SKIP: {req['name']} already at {current_value} (requested {req['value']})")
                continue

            # Submit the request
            response = sq.request_service_quota_increase(
                ServiceCode=req['service'],
                QuotaCode=req['quota'],
                DesiredValue=req['value']
            )

            request_id = response['RequestedQuota']['Id']
            print(f"REQUESTED: {req['name']} - {current_value} -> {req['value']} (ID: {request_id})")
            results.append({'name': req['name'], 'id': request_id, 'status': 'REQUESTED'})

            # Small delay to avoid rate limiting
            time.sleep(1)

        except sq.exceptions.ResourceAlreadyExistsException:
            print(f"PENDING: {req['name']} already has a pending request")
            results.append({'name': req['name'], 'status': 'ALREADY_PENDING'})

        except Exception as e:
            print(f"ERROR: {req['name']} - {e}")
            results.append({'name': req['name'], 'status': 'ERROR', 'error': str(e)})

    return results

request_quota_increases()
```

## Quota Request Templates for AWS Organizations

If you manage multiple accounts through AWS Organizations, create quota request templates that automatically apply when new accounts are created:

```bash
# Associate the service quota template with your organization
aws service-quotas associate-service-quota-template

# Add a template entry for Lambda concurrency
aws service-quotas put-service-quota-increase-request-into-template \
  --service-code lambda \
  --quota-code L-B99A9384 \
  --desired-value 3000 \
  --aws-region us-east-1

# Add a template entry for EC2 instances
aws service-quotas put-service-quota-increase-request-into-template \
  --service-code ec2 \
  --quota-code L-1216C47A \
  --desired-value 500 \
  --aws-region us-east-1

# List all templates
aws service-quotas list-service-quota-increase-requests-in-template \
  --query "ServiceQuotaIncreaseRequestInTemplateList[].{
    Service: ServiceCode,
    Quota: QuotaName,
    DesiredValue: DesiredValue,
    Region: AwsRegion
  }" \
  --output table
```

This is especially useful for organizations that regularly create new AWS accounts for teams or projects. See our guide on [setting up AWS Organizations consolidated billing](https://oneuptime.com/blog/post/set-up-aws-organizations-consolidated-billing/view) for more on multi-account management.

## Tips for Faster Approvals

**Be specific about your use case.** When you create a support case or add notes to a quota request, explain why you need the increase. "We're scaling our production API to handle holiday traffic" gets approved faster than a bare request with no context.

**Request reasonable amounts.** Asking to go from 5 VPCs to 20 is reasonable. Asking to go from 5 to 500 will trigger additional review. If you need a very large increase, ramp up in stages.

**Request before you need it.** Some requests are approved instantly (common increases like VPC or EBS limits). Others take 1-3 business days. Don't wait until you're already hitting the limit.

**Use the right support level.** Business and Enterprise support plans get faster response times for quota increase requests.

**Check for automatic increases.** Some quotas are increased automatically based on your usage patterns. AWS gradually raises limits as your account history grows.

## Monitor Quota Changes

Set up a script that periodically checks whether your quota requests have been approved:

```python
import boto3

def check_pending_requests():
    """Check status of all pending quota increase requests"""
    sq = boto3.client('service-quotas')

    response = sq.list_requested_service_quota_changes_in_history(
        Status='PENDING'
    )

    if not response['RequestedQuotas']:
        print("No pending quota requests.")
        return

    print(f"{'Service':<15} {'Quota':<40} {'Requested':<12} {'Status':<10} {'Date'}")
    print("-" * 90)

    for req in response['RequestedQuotas']:
        print(f"{req['ServiceCode']:<15} {req['QuotaName'][:38]:<40} "
              f"{req['DesiredValue']:<12.0f} {req['Status']:<10} "
              f"{req['Created'].strftime('%Y-%m-%d')}")

check_pending_requests()
```

## Emergency Quota Increases

If you're already hitting a limit in production, here's what to do:

1. **Contact AWS Support immediately** through a support case with severity "Production system impaired" or "Production system down"
2. **Use multiple instance families** as a workaround - if you're hitting EC2 limits on m5 instances, you might have headroom on m6i or c5 instances
3. **Spread across regions** if the quota is region-specific
4. **Check if the quota applies per-account** - if you're in an organization, you might be able to launch resources in another account temporarily

```bash
# Emergency: create a high-severity support case
aws support create-case \
  --subject "URGENT: EC2 Instance Limit Reached - Production Impact" \
  --communication-body "We have reached our EC2 on-demand instance limit in us-east-1 and our auto-scaling group cannot launch new instances to handle production traffic. Current limit: 256. Required: 400. This is causing service degradation for our customers." \
  --service-code "amazon-elastic-compute-cloud-linux" \
  --category-code "instance-limit" \
  --severity-code "urgent" \
  --language "en"
```

## Key Takeaways

Quota increases are a routine part of AWS operations, but they need to be managed proactively. Request increases before you need them, use templates for new accounts, and monitor your usage against limits continuously. The requests themselves are straightforward - the key is not being caught off guard. For monitoring your quotas, check out our guide on [setting up AWS service quotas and limits](https://oneuptime.com/blog/post/set-up-aws-service-quotas-and-limits/view).
