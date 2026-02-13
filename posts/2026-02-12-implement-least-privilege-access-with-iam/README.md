# How to Implement Least Privilege Access with IAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, Best Practices

Description: A practical guide to implementing the principle of least privilege in AWS IAM, with strategies for right-sizing permissions, monitoring access, and continuous improvement.

---

Least privilege means giving users and applications only the permissions they need to do their job, nothing more. It sounds simple, but in practice it's one of the hardest things to get right in AWS. Teams default to broad permissions because it's faster, and then never come back to tighten them.

The cost of getting it wrong is real - overly permissive access is one of the top causes of cloud security incidents. Let's look at practical strategies for implementing least privilege without slowing down your team.

## Why Least Privilege Is Hard

The challenge isn't the concept - it's the execution. When a developer needs to deploy a Lambda function, they don't just need `lambda:CreateFunction`. They need `iam:PassRole`, `s3:GetObject` (to read the deployment package), `logs:CreateLogGroup`, `logs:CreateLogStream`, and a dozen other actions. Figuring out the exact set of permissions for every use case takes time.

So teams take shortcuts:

```json
{
    "Effect": "Allow",
    "Action": "*",
    "Resource": "*"
}
```

This works, but it means a compromised credential can do anything in the account - delete databases, exfiltrate data, spin up crypto miners. Least privilege limits the blast radius.

## Strategy 1: Start Broad, Then Tighten

The most practical approach is to start with broader permissions and systematically reduce them using data about actual usage.

**Step 1:** Grant access to the services someone needs, but with full service access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:*",
                "lambda:*",
                "dynamodb:*",
                "logs:*"
            ],
            "Resource": "*"
        }
    ]
}
```

**Step 2:** After a few weeks, use IAM Access Analyzer to see which actions were actually used:

```bash
# Generate an IAM policy based on actual CloudTrail activity
aws accessanalyzer generate-policy \
  --policy-generation-details '{"principalArn": "arn:aws:iam::123456789012:role/MyAppRole"}' \
  --cloud-trail-details '{
    "trails": [{
      "cloudTrailArn": "arn:aws:cloudtrail:us-east-1:123456789012:trail/my-trail",
      "regions": ["us-east-1"],
      "allRegions": false
    }],
    "accessRole": "arn:aws:iam::123456789012:role/AccessAnalyzerRole",
    "startTime": "2026-01-01T00:00:00Z",
    "endTime": "2026-02-01T00:00:00Z"
  }'
```

This generates a policy based on what the role actually did over the specified period. The generated policy is your new, tightened baseline.

**Step 3:** Replace the broad policy with the generated one, adding a small buffer for actions that might not have occurred during the observation period.

## Strategy 2: Use AWS Managed Policies as Starting Points

AWS provides managed policies for common job functions. They're not perfect, but they're better than `*:*`:

```bash
# Some useful managed policies
aws iam list-policies --scope AWS --query "Policies[?contains(PolicyName, 'ReadOnly')].[PolicyName,Arn]" --output table
```

Common managed policies include:
- `ViewOnlyAccess` - Read-only access to most services
- `PowerUserAccess` - Full access to services, no IAM management
- `DatabaseAdministrator` - Access to database services
- `SystemAdministrator` - Access to infrastructure services

These are starting points, not final solutions. Copy the policy, remove the actions you don't need, and scope the resources.

## Strategy 3: Resource-Level Permissions

The biggest improvement over service-level access is specifying resources:

Instead of this:

```json
{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "*"
}
```

Do this:

```json
{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": [
        "arn:aws:s3:::my-app-config/*",
        "arn:aws:s3:::my-app-assets/*"
    ]
}
```

Not every AWS action supports resource-level permissions. Check the [service authorization reference](https://docs.aws.amazon.com/service-authorization/latest/reference/) to see which actions support which resource types. For actions that don't support resource-level permissions (many Describe/List actions), you have to use `"Resource": "*"`.

## Strategy 4: Conditions for Context-Based Access

Conditions add another dimension of restriction:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowEC2InDev",
            "Effect": "Allow",
            "Action": [
                "ec2:StartInstances",
                "ec2:StopInstances",
                "ec2:TerminateInstances"
            ],
            "Resource": "*",
            "Condition": {
                "StringEquals": {
                    "ec2:ResourceTag/Environment": "development"
                }
            }
        },
        {
            "Sid": "DenyWithoutMFA",
            "Effect": "Deny",
            "Action": [
                "ec2:TerminateInstances",
                "rds:DeleteDBInstance"
            ],
            "Resource": "*",
            "Condition": {
                "BoolIfExists": {
                    "aws:MultiFactorAuthPresent": "false"
                }
            }
        }
    ]
}
```

This policy allows instance management only in development environments and requires MFA for destructive actions. For more on conditions, see our guides on [IP-based access](https://oneuptime.com/blog/post/2026-02-12-write-iam-policy-conditions-for-ip-based-access/view), [MFA requirements](https://oneuptime.com/blog/post/2026-02-12-write-iam-policy-conditions-for-mfa-requirements/view), and [tag-based access control](https://oneuptime.com/blog/post/2026-02-12-write-iam-policy-conditions-for-tag-based-access-control/view).

## Strategy 5: Separate Roles for Different Tasks

Instead of one role with all permissions, create task-specific roles:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowAssumeTaskRoles",
            "Effect": "Allow",
            "Action": "sts:AssumeRole",
            "Resource": [
                "arn:aws:iam::123456789012:role/deploy-role",
                "arn:aws:iam::123456789012:role/debug-role",
                "arn:aws:iam::123456789012:role/database-admin-role"
            ]
        }
    ]
}
```

Users start with minimal permissions and assume specific roles when they need to perform specific tasks. Each role has just the permissions for that task. This is like sudo in Linux - you escalate only when needed.

## Strategy 6: Automated Policy Generation

Several tools can help generate least-privilege policies:

**IAM Access Analyzer policy generation** (shown above) uses CloudTrail data.

**CloudTrail Lake** lets you query API activity with SQL:

```sql
-- Find all S3 actions performed by a specific role in the last 30 days
SELECT
    eventName,
    COUNT(*) as count,
    element_at(requestParameters, 'bucketName') as bucket
FROM cloudtrail_logs
WHERE userIdentity.arn LIKE '%role/MyAppRole%'
AND eventSource = 's3.amazonaws.com'
AND eventTime > date_add('day', -30, now())
GROUP BY eventName, element_at(requestParameters, 'bucketName')
ORDER BY count DESC
```

**Repokid** (open source from Netflix) automates policy reduction by analyzing CloudTrail access and removing unused permissions.

## Strategy 7: Permission Boundaries as Safety Nets

Even if your IAM policies are broader than ideal, permission boundaries cap the maximum:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:*",
                "dynamodb:*",
                "sqs:*",
                "sns:*",
                "lambda:*",
                "logs:*",
                "cloudwatch:*"
            ],
            "Resource": "*"
        }
    ]
}
```

Attach this as a boundary and no matter what policies users create for their roles, those roles can never access services outside this list. For details, see our guide on [setting up IAM permission boundaries](https://oneuptime.com/blog/post/2026-02-12-set-up-iam-permission-boundaries/view).

## Monitoring and Continuous Improvement

Least privilege isn't a one-time setup. It's ongoing:

```bash
# Find unused IAM credentials
aws iam generate-credential-report
aws iam get-credential-report --output text --query Content | base64 -d > credential-report.csv

# Find unused permissions with Access Analyzer
aws accessanalyzer list-findings --analyzer-arn $ANALYZER_ARN
```

Set up regular reviews:
1. **Monthly:** Review IAM Access Analyzer findings for external access
2. **Quarterly:** Check credential reports for unused users and keys
3. **Per release:** Review application IAM roles when functionality changes

## The Practical Balance

Perfect least privilege is impossible in a moving codebase. New features need new permissions, and you can't predict every API call before writing the code. The goal isn't perfection - it's continuous improvement:

- Start with service-level access scoped to specific resources
- Use Access Analyzer to identify and remove unused permissions
- Add conditions (tags, IP, MFA) for sensitive operations
- Use permission boundaries as a safety net
- Review and tighten periodically

A policy that grants access to 5 specific S3 buckets is much better than `s3:*` on `*`, even if it allows a few more actions than strictly necessary.

## Wrapping Up

Least privilege is a journey, not a destination. Start with the tools AWS gives you - Access Analyzer, credential reports, CloudTrail - to understand what's actually being used. Then systematically tighten permissions using resource-level restrictions, conditions, and role separation. Don't let perfect be the enemy of good. Every step toward tighter permissions reduces your attack surface and limits the damage a compromised credential can do.
