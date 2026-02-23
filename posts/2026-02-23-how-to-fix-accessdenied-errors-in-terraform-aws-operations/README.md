# How to Fix AccessDenied Errors in Terraform AWS Operations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Troubleshooting, Infrastructure as Code

Description: Practical steps to troubleshoot and resolve AccessDenied errors when running Terraform against AWS, including IAM policy debugging and permission boundaries.

---

AccessDenied errors are one of the most common and most annoying issues you will face when using Terraform with AWS. The error means the IAM identity Terraform is using does not have permission to perform a specific action. What makes it particularly frustrating is that the error message often does not tell you exactly which permission is missing.

This guide will walk you through how to identify the missing permission, fix it, and prevent these errors from recurring.

## What the Error Looks Like

AccessDenied errors in Terraform typically appear during `terraform plan` or `terraform apply`:

```
Error: error creating S3 Bucket (my-bucket): AccessDenied: Access Denied
    status code: 403, request id: ABC123XYZ

Error: error describing EC2 Instances: UnauthorizedOperation: You are not
authorized to perform this operation.
```

The exact wording varies by AWS service, but the meaning is the same: the IAM credentials Terraform is using lack the necessary permissions.

## Step 1: Identify Who You Are

Before fixing permissions, you need to know exactly which IAM identity Terraform is using:

```bash
# Check the current identity
aws sts get-caller-identity
```

This returns something like:

```json
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/terraform-user"
}
```

Make sure this matches the identity you expect. If it does not, you might have the wrong profile or environment variables set.

## Step 2: Identify the Missing Permission

The error message usually hints at the missing permission, but not always clearly. Here is how to decode it:

**From the error message:** If the error says "error creating S3 Bucket," the missing permission is likely `s3:CreateBucket`.

**From AWS CloudTrail:** For more precise information, check CloudTrail:

```bash
# Look up recent access denied events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=CreateBucket \
  --max-results 5
```

CloudTrail events will show you the exact API call that was denied, including the full IAM evaluation context.

**Using the IAM Policy Simulator:**

```bash
# Simulate whether a specific action would be allowed
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/terraform-user \
  --action-names s3:CreateBucket \
  --resource-arns "arn:aws:s3:::my-bucket"
```

## Step 3: Common Permission Issues and Fixes

### Missing Service Permissions

The most straightforward case. Your IAM policy simply does not include the required action:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:DeleteBucket",
                "s3:GetBucketPolicy",
                "s3:PutBucketPolicy",
                "s3:GetBucketAcl",
                "s3:PutBucketAcl",
                "s3:ListBucket",
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::my-bucket",
                "arn:aws:s3:::my-bucket/*"
            ]
        }
    ]
}
```

Remember that Terraform needs permissions for both creating and reading resources. Even for a `terraform plan`, it needs describe/get/list permissions to refresh the state.

### Resource-Level Restrictions

Your policy might allow the action but restrict it to specific resources:

```json
{
    "Effect": "Allow",
    "Action": "ec2:*",
    "Resource": "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123def456789"
}
```

This policy allows EC2 actions, but only on a specific instance. If Terraform tries to create a new instance, it will get AccessDenied because the new instance ARN does not match.

For Terraform, you typically need broader resource permissions:

```json
{
    "Effect": "Allow",
    "Action": "ec2:*",
    "Resource": "*"
}
```

### Condition-Based Denials

Your policy might have conditions that are not being met:

```json
{
    "Effect": "Allow",
    "Action": "s3:*",
    "Resource": "*",
    "Condition": {
        "StringEquals": {
            "aws:RequestedRegion": "us-east-1"
        }
    }
}
```

If Terraform tries to create an S3 bucket in `us-west-2`, this policy will deny the request. Make sure your provider region matches the conditions.

### Permission Boundaries

Permission boundaries cap the maximum permissions an IAM entity can have. Even if the policy allows an action, the permission boundary can override it:

```bash
# Check if a permission boundary is attached
aws iam get-user --user-name terraform-user
```

Look for the `PermissionsBoundary` field in the output. If one exists, the effective permissions are the intersection of the policy and the boundary.

### Service Control Policies (SCPs)

If you are in an AWS Organization, SCPs can deny actions at the account level. These cannot be overridden by IAM policies:

```bash
# List SCPs attached to the account (requires Organizations access)
aws organizations list-policies-for-target \
  --target-id 123456789012 \
  --filter SERVICE_CONTROL_POLICY
```

### Explicit Deny Statements

An explicit deny always wins over any allow. Check all policies attached to the user, group, or role for deny statements:

```bash
# List all policies attached to the user
aws iam list-attached-user-policies --user-name terraform-user
aws iam list-user-policies --user-name terraform-user

# For roles
aws iam list-attached-role-policies --role-name terraform-role
aws iam list-role-policies --role-name terraform-role
```

## Step 4: Create a Proper Terraform IAM Policy

Here is a practical IAM policy for Terraform that covers common infrastructure provisioning needs:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "TerraformStateAccess",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::my-terraform-state-bucket",
                "arn:aws:s3:::my-terraform-state-bucket/*"
            ]
        },
        {
            "Sid": "TerraformDynamoDBLocking",
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": "arn:aws:dynamodb:*:*:table/terraform-locks"
        },
        {
            "Sid": "TerraformInfraProvisioning",
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "s3:*",
                "rds:*",
                "iam:*",
                "lambda:*",
                "cloudwatch:*"
            ],
            "Resource": "*"
        }
    ]
}
```

This is a broad policy suitable for development. For production, you should scope down the permissions to only what Terraform actually needs.

## Step 5: Debug with Terraform Logging

Enable detailed logging to see exactly what API calls Terraform is making:

```bash
export TF_LOG=DEBUG
terraform plan 2>&1 | grep -i "denied\|unauthorized\|error"
```

The debug logs will show every API request and response, making it much easier to identify which call is being denied.

## Preventing Future AccessDenied Errors

1. **Start broad, then narrow down.** Begin with wider permissions during development, then use tools like IAM Access Analyzer to identify the minimum required permissions.

2. **Use IAM Access Analyzer.** AWS can analyze your CloudTrail logs and generate a policy with only the permissions your Terraform actually used:

```bash
aws accessanalyzer start-policy-generation \
  --policy-generation-details '{"principalArn":"arn:aws:iam::123456789012:role/terraform-role"}'
```

3. **Test with `terraform plan` first.** A plan operation requires fewer permissions than apply but will surface most permission issues.

4. **Monitor with alerts.** Set up monitoring with [OneUptime](https://oneuptime.com) to get notified when your Terraform runs fail due to permission issues, so you can address them quickly.

5. **Use separate IAM roles** for different environments (dev, staging, production) with appropriately scoped permissions.

## Conclusion

AccessDenied errors in Terraform boil down to the IAM identity not having the right permissions for the API calls Terraform needs to make. The fix follows a predictable pattern: identify who you are, figure out what permission is missing, and add it to the appropriate policy. Tools like CloudTrail, the IAM Policy Simulator, and IAM Access Analyzer make this process much more manageable than guessing.
