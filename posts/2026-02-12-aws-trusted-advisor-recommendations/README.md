# How to Use AWS Trusted Advisor Recommendations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Trusted Advisor, Cost Optimization, Security

Description: Learn how to use AWS Trusted Advisor to identify cost savings, security vulnerabilities, performance improvements, and fault tolerance gaps in your AWS account.

---

AWS Trusted Advisor is one of those services that every AWS account has access to, but surprisingly few teams actually use regularly. It's essentially a best-practices auditor that scans your AWS account and flags issues across five categories: cost optimization, performance, security, fault tolerance, and service limits. Some checks are free. Others require a Business or Enterprise support plan. Either way, it's worth knowing what's available and how to act on the recommendations.

## What Trusted Advisor Checks

Trusted Advisor runs automated checks against your AWS resources and compares them to AWS best practices. Here's what each category covers:

**Cost Optimization** finds money you're leaving on the table - idle load balancers, underutilized EC2 instances, unassociated Elastic IPs, and unused EBS volumes.

**Security** flags things like open security groups, IAM access keys that haven't been rotated, MFA not enabled on the root account, and S3 buckets with public access.

**Fault Tolerance** identifies single points of failure - EBS volumes without snapshots, Auto Scaling groups in a single AZ, and RDS instances without Multi-AZ.

**Performance** spots resources that could perform better - high-utilization EC2 instances, CloudFront distributions without compression, and overutilized EBS volumes.

**Service Limits** warns you when you're approaching AWS service quotas before you hit them.

## Free vs. Paid Checks

With a Basic or Developer support plan, you get access to six core security checks and the service limits checks. That's it. Here's what's free:

- S3 Bucket Permissions
- Security Groups - Specific Ports Unrestricted
- IAM Use
- MFA on Root Account
- EBS Public Snapshots
- RDS Public Snapshots
- Service Limits (all checks)

For the full set of checks (over 100), you need a Business or Enterprise support plan. If you're running production workloads on AWS, the cost savings Trusted Advisor identifies usually pay for the support plan several times over.

## Accessing Trusted Advisor via CLI

You can interact with Trusted Advisor programmatically through the AWS Support API. Note that this API is only available in us-east-1.

To list all available checks:

```bash
# List all Trusted Advisor checks (must use us-east-1)
aws support describe-trusted-advisor-checks \
  --language "en" \
  --region us-east-1 \
  --query "checks[].{Id:id,Name:name,Category:category}" \
  --output table
```

To get results for a specific check, you need its check ID. Let's get the results for the "Low Utilization Amazon EC2 Instances" check:

```bash
# First, find the check ID
aws support describe-trusted-advisor-checks \
  --language "en" \
  --region us-east-1 \
  --query "checks[?name=='Low Utilization Amazon EC2 Instances'].id" \
  --output text

# Then get the results (replace CHECK_ID with the actual ID)
aws support describe-trusted-advisor-check-result \
  --check-id "CHECK_ID" \
  --language "en" \
  --region us-east-1
```

## Refreshing Checks

Trusted Advisor data can be up to 24 hours old. If you want fresh data, you can request a refresh:

```bash
# Refresh a specific check
aws support refresh-trusted-advisor-check \
  --check-id "CHECK_ID" \
  --region us-east-1
```

Note that refreshes are rate-limited. You can't refresh the same check more than once every 5 minutes, and there's a limit on how many refreshes you can do per day.

To refresh all checks at once, you can script it:

```bash
# Refresh all Trusted Advisor checks
for CHECK_ID in $(aws support describe-trusted-advisor-checks \
  --language "en" \
  --region us-east-1 \
  --query "checks[].id" \
  --output text); do
  echo "Refreshing check: $CHECK_ID"
  aws support refresh-trusted-advisor-check \
    --check-id "$CHECK_ID" \
    --region us-east-1 2>/dev/null
  # Small delay to avoid throttling
  sleep 1
done
```

## Acting on Cost Optimization Recommendations

The cost optimization category is where most teams find the quickest wins. Here are the most common findings and what to do about them.

**Idle Load Balancers**: Load balancers that have had less than 100 requests per day for the last 7 days. Check if they're actually needed. If not, delete them and save $18/month per idle Classic LB.

**Underutilized EC2 Instances**: Instances where average CPU is below 10% and network I/O is below 5 MB/day for 14 days. Consider right-sizing these or switching to smaller instance types.

Here's a script to pull underutilized instances and estimate savings:

```bash
# Get underutilized EC2 instances from Trusted Advisor
aws support describe-trusted-advisor-check-result \
  --check-id "Qch7DwouX1" \
  --language "en" \
  --region us-east-1 \
  --query "result.flaggedResources[].metadata" \
  --output json | python3 -c "
import json, sys
data = json.load(sys.stdin)
total_savings = 0
for item in data:
    # Metadata fields: region, instance_id, instance_name, instance_type,
    # estimated_monthly_savings, avg_cpu, etc.
    instance_id = item[1]
    instance_type = item[3]
    savings = float(item[4].replace('$', '').replace(',', ''))
    total_savings += savings
    print(f'{instance_id} ({instance_type}): \${savings:.2f}/month')
print(f'\nTotal potential savings: \${total_savings:.2f}/month')
"
```

**Unassociated Elastic IPs**: Each unassociated Elastic IP costs about $3.60/month. These add up fast if people forget to release them.

```bash
# Find and release unassociated Elastic IPs
aws ec2 describe-addresses \
  --query "Addresses[?AssociationId==null].{IP:PublicIp,AllocationId:AllocationId}" \
  --output table
```

## Acting on Security Recommendations

Security findings should be treated with urgency. Here are the most critical ones:

**Security Groups with Unrestricted Access**: Groups with 0.0.0.0/0 on sensitive ports (SSH, RDP, database ports). These need immediate attention.

```bash
# Find security groups with SSH open to the world
aws ec2 describe-security-groups \
  --filters "Name=ip-permission.from-port,Values=22" \
  --query "SecurityGroups[?IpPermissions[?IpRanges[?CidrIp=='0.0.0.0/0']]].{GroupId:GroupId,GroupName:GroupName}" \
  --output table
```

**MFA on Root Account**: If this check is red, stop everything and enable MFA on the root account. This is the single most important security action you can take.

**IAM Access Key Rotation**: Keys older than 90 days should be rotated. Here's how to find old keys:

```bash
# Find IAM access keys older than 90 days
aws iam generate-credential-report > /dev/null 2>&1
sleep 5
aws iam get-credential-report \
  --query "Content" \
  --output text | base64 --decode | \
  awk -F',' 'NR>1 && $9 != "N/A" {print $1, $9}'
```

## Automating Trusted Advisor with EventBridge

You can set up EventBridge rules to react to Trusted Advisor check status changes. This is useful for alerting or auto-remediation.

```bash
# EventBridge rule for Trusted Advisor status changes
aws events put-rule \
  --name "trusted-advisor-alerts" \
  --event-pattern '{
    "source": ["aws.trustedadvisor"],
    "detail-type": ["Trusted Advisor Check Item Refresh Notification"],
    "detail": {
      "status": ["WARN", "ERROR"]
    }
  }'
```

Route these to SNS, Lambda, or Systems Manager OpsCenter for tracking. If you're using OpsCenter, you can automatically create OpsItems from Trusted Advisor findings - see our post on [OpsCenter for operational issues](https://oneuptime.com/blog/post/systems-manager-opscenter-operational-issues/view).

## Setting Up Weekly Reports

A good practice is to generate weekly Trusted Advisor reports and share them with your team. Here's a Lambda function approach:

```python
import boto3
import json
from datetime import datetime

def lambda_handler(event, context):
    # Trusted Advisor API only works in us-east-1
    support = boto3.client('support', region_name='us-east-1')
    sns = boto3.client('sns')

    checks = support.describe_trusted_advisor_checks(language='en')
    report_lines = [f"Trusted Advisor Weekly Report - {datetime.now().strftime('%Y-%m-%d')}\n"]

    for check in checks['checks']:
        result = support.describe_trusted_advisor_check_result(
            checkId=check['id'],
            language='en'
        )
        status = result['result']['status']

        # Only include checks that need attention
        if status in ['warning', 'error']:
            flagged_count = len(result['result'].get('flaggedResources', []))
            report_lines.append(
                f"[{status.upper()}] {check['name']} "
                f"({check['category']}): {flagged_count} resources flagged"
            )

    report = '\n'.join(report_lines)

    # Send via SNS
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:weekly-ta-report',
        Subject='Weekly Trusted Advisor Report',
        Message=report
    )

    return {'statusCode': 200, 'body': 'Report sent'}
```

Trigger this with an EventBridge scheduled rule running every Monday morning.

## Service Limits Monitoring

Service limits might be the most practically useful free check. Hitting a service limit during a scale-up event is a terrible experience. Trusted Advisor warns you when you're at 80% of a limit.

```bash
# Get service limit warnings
aws support describe-trusted-advisor-check-result \
  --check-id "eW7HH0l7J9" \
  --language "en" \
  --region us-east-1 \
  --query "result.flaggedResources[?status!='ok'].metadata" \
  --output json
```

When you get a warning, request a limit increase before you need it:

```bash
# Request a service quota increase
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code "L-1216C47A" \
  --desired-value 500
```

## Best Practices

1. **Check Trusted Advisor weekly** at minimum. Set up the weekly report automation if your team won't check the console regularly.
2. **Prioritize security findings** over everything else. A single open security group can compromise your entire account.
3. **Track cost savings** from Trusted Advisor recommendations. This builds the business case for the support plan and for continued optimization work.
4. **Don't suppress warnings** unless you've consciously decided to accept the risk. Suppressed warnings are forgotten warnings.
5. **Use it alongside other tools** - Trusted Advisor is a starting point, not a complete governance solution.

## Wrapping Up

Trusted Advisor is low-hanging fruit. It takes 10 minutes to review the dashboard, and it routinely identifies thousands of dollars in monthly savings and critical security gaps. Make it part of your regular operations rhythm, automate the reporting, and act on the findings. Your AWS bill and security posture will both improve.
