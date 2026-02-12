# How to Fix 'You are not authorized to perform this operation' IAM Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, Troubleshooting, Permissions

Description: Diagnose and resolve AWS IAM authorization errors by understanding policy evaluation, identifying missing permissions, and fixing common IAM misconfigurations.

---

You try to do something in AWS and get slapped with:

```
An error occurred (AccessDeniedException) when calling the DescribeInstances operation:
You are not authorized to perform this operation.
```

Or its close cousin:

```
User: arn:aws:iam::123456789:user/devuser is not authorized to perform:
ec2:DescribeInstances on resource: *
```

These are IAM permission errors, and they're telling you that your identity (user, role, or federated session) doesn't have permission to do what you're trying to do. Let's figure out why and fix it.

## Step 1: Identify Who You Are

Before you can fix permissions, you need to know exactly which identity is making the request.

```bash
# This tells you your current identity
aws sts get-caller-identity
```

The output shows:
- **Account** - which AWS account you're in
- **UserId** - the unique ID of your user or role session
- **Arn** - the full ARN of your identity

Make sure this matches what you expect. Sometimes you're authenticated as a different user or role than you think - especially if you've assumed a role or have environment variables set.

## Step 2: Understand the Error Message

AWS error messages have gotten better over the years. Parse the message carefully:

```
User: arn:aws:iam::123456789:user/devuser
is not authorized to perform: ec2:DescribeInstances
on resource: *
with an explicit deny in a service control policy
```

This tells you:
- **Who** - `devuser`
- **What action** - `ec2:DescribeInstances`
- **What resource** - `*` (all resources)
- **Why** - explicit deny in a service control policy

The "why" part is the most valuable. It can say:
- "because no identity-based policy allows..." - you're missing a permission
- "with an explicit deny..." - a policy is actively blocking you
- "with an explicit deny in a service control policy" - an Organizations SCP is blocking you

## Step 3: Check Your Policies

List all the policies attached to your identity.

```bash
# For an IAM user
aws iam list-attached-user-policies --user-name devuser
aws iam list-user-policies --user-name devuser  # inline policies

# For groups the user belongs to
aws iam list-groups-for-user --user-name devuser

# For each group, check its policies
aws iam list-attached-group-policies --group-name developers
aws iam list-group-policies --group-name developers

# For a role
aws iam list-attached-role-policies --role-name my-role
aws iam list-role-policies --role-name my-role
```

Then examine each policy to see what it allows.

```bash
# Get the details of an attached policy
aws iam get-policy --policy-arn arn:aws:iam::123456789:policy/my-policy

# Get the actual policy document (need the version ID from above)
aws iam get-policy-version \
  --policy-arn arn:aws:iam::123456789:policy/my-policy \
  --version-id v1
```

## Step 4: Use the IAM Policy Simulator

AWS provides a policy simulator that tells you whether a specific action would be allowed or denied, and which policy is responsible.

```bash
# Simulate a specific action
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789:user/devuser \
  --action-names ec2:DescribeInstances

# Simulate multiple actions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789:user/devuser \
  --action-names ec2:DescribeInstances ec2:StartInstances ec2:StopInstances
```

The output tells you whether each action is allowed or denied and which policy caused the decision.

## Common Fixes

### Fix 1: Add the Missing Permission

The most straightforward fix - create or update a policy to include the missing permission.

```bash
# Create a policy with the needed permission
aws iam create-policy \
  --policy-name ec2-describe-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "ec2:DescribeInstances",
        "Resource": "*"
      }
    ]
  }'

# Attach it to the user
aws iam attach-user-policy \
  --user-name devuser \
  --policy-arn arn:aws:iam::123456789:policy/ec2-describe-access
```

For broader access, use AWS managed policies.

```bash
# Give read-only EC2 access
aws iam attach-user-policy \
  --user-name devuser \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess
```

### Fix 2: Remove an Explicit Deny

If a policy has an explicit Deny statement that's blocking the action, Allow won't override it. Deny always wins in IAM.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "ec2:TerminateInstances",
      "Resource": "*"
    }
  ]
}
```

To fix this, you need to either:
- Remove the Deny statement
- Add a condition to make the Deny more specific so it doesn't apply to your use case

### Fix 3: Check Resource-Level Restrictions

Some policies restrict actions to specific resources. Your action might be allowed on some resources but not others.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

This allows `s3:GetObject` only on `my-bucket`. Trying to access `other-bucket` will fail with an authorization error.

### Fix 4: Check Conditions

Policies can have conditions that restrict when they apply.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ec2:*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
```

This only allows EC2 actions in `us-east-1`. Running a command against `eu-west-1` will be denied.

### Fix 5: Service Control Policies (Organizations)

If the error mentions a service control policy, the restriction is at the AWS Organizations level. Individual account policies can't override SCPs.

You need an organization admin to update the SCP. Regular IAM changes in the account won't help.

```bash
# List SCPs applied to the account (requires Organizations permissions)
aws organizations list-policies-for-target \
  --target-id 123456789012 \
  --filter SERVICE_CONTROL_POLICY
```

### Fix 6: Permission Boundaries

Permission boundaries limit the maximum permissions a user or role can have, even if their policies allow more.

```bash
# Check if a permission boundary is set
aws iam get-user --user-name devuser

# Look for PermissionsBoundary in the output
```

If a permission boundary exists, your effective permissions are the intersection of your policies and the boundary. Adding more policies won't help if the boundary doesn't include the permission.

## Debugging with CloudTrail

For intermittent or hard-to-reproduce issues, CloudTrail logs every API call with the authorization details.

```bash
# Look up recent access denied events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=DescribeInstances \
  --max-results 5
```

The CloudTrail event includes the error code and details about which policy caused the denial.

## A Systematic Approach

When you hit an authorization error, follow this checklist:

1. Run `aws sts get-caller-identity` to confirm your identity
2. Read the error message carefully - note the action, resource, and reason
3. Check your policies (user, group, and role)
4. Use the IAM Policy Simulator
5. Look for explicit denies
6. Check for permission boundaries
7. Check for SCPs (if using Organizations)
8. Check CloudTrail for detailed deny reasons

## Summary

IAM authorization errors are AWS telling you exactly what's wrong, but the message can be cryptic. The key tools are `sts get-caller-identity` (to verify who you are), the IAM Policy Simulator (to test what you can do), and CloudTrail (to see detailed deny reasons). Most of the time, it's a missing Allow statement. But watch out for explicit Denies, SCPs, and permission boundaries - those can block you even when your policies look correct.
