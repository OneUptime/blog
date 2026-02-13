# How to Use IAM Policy Variables for Dynamic Permissions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, Policies

Description: Learn how to use IAM policy variables to create dynamic, reusable permissions that adapt based on the requesting user, session, or resource attributes.

---

Writing a separate IAM policy for every user is tedious and doesn't scale. IAM policy variables let you write one policy that adapts dynamically based on who's making the request. Instead of hardcoding usernames, account IDs, or tag values, you reference variables that resolve at evaluation time.

This is one of the most powerful features of IAM policies, and it's the foundation of tag-based access control (ABAC). Let's explore every useful policy variable and see how they work in practice.

## What Are Policy Variables?

Policy variables are placeholders in your policy JSON that AWS replaces with actual values when evaluating the policy. They use the syntax `${variable_name}` and can appear in the `Resource` and `Condition` elements of a policy.

For example, `${aws:username}` resolves to the name of the IAM user making the request. So instead of writing:

```json
"Resource": "arn:aws:s3:::company-data/home/alice/*"
```

You write:

```json
"Resource": "arn:aws:s3:::company-data/home/${aws:username}/*"
```

Now the same policy works for every user - alice gets access to her folder, bob gets access to his folder, and so on.

## Available Policy Variables

Here are the most commonly used policy variables:

### Identity Variables

**`${aws:username}`** - The IAM user's name. Only available for IAM users, not for assumed roles.

```json
{
    "Sid": "AllowUsersOwnFolder",
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::company-home/${aws:username}/*"
}
```

**`${aws:userid}`** - The unique ID of the caller. For IAM users, this is the user ID. For assumed roles, it's `role-id:session-name`.

**`${aws:PrincipalAccount}`** - The AWS account ID of the caller. Useful in cross-account scenarios.

**`${aws:PrincipalOrgID}`** - The AWS Organizations ID of the caller's account.

### Tag Variables

**`${aws:PrincipalTag/TagKey}`** - The value of a tag on the IAM user or role making the request. This is the backbone of ABAC.

```json
{
    "Sid": "AllowTeamResources",
    "Effect": "Allow",
    "Action": "ec2:*",
    "Resource": "*",
    "Condition": {
        "StringEquals": {
            "ec2:ResourceTag/Team": "${aws:PrincipalTag/Team}"
        }
    }
}
```

**`${aws:RequestTag/TagKey}`** - The value of a tag in the current request (used when creating or tagging resources).

**`${s3:prefix}`** - S3-specific variable representing the prefix in a ListBucket request.

### Session Variables

**`${aws:FederatedProvider}`** - The identity provider for federated users.

**`${aws:TokenIssueTime}`** - When the temporary credentials were issued.

## Practical Example: Per-User S3 Home Directories

One of the most common patterns is giving each user their own folder in an S3 bucket:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowListBucketInOwnFolder",
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::company-shared",
            "Condition": {
                "StringLike": {
                    "s3:prefix": ["home/${aws:username}/*", "home/${aws:username}"]
                }
            }
        },
        {
            "Sid": "AllowFullAccessToOwnFolder",
            "Effect": "Allow",
            "Action": "s3:*",
            "Resource": "arn:aws:s3:::company-shared/home/${aws:username}/*"
        },
        {
            "Sid": "AllowListBucketRoot",
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::company-shared",
            "Condition": {
                "StringEquals": {
                    "s3:prefix": ["", "home/"],
                    "s3:delimiter": ["/"]
                }
            }
        }
    ]
}
```

The third statement allows users to browse the top-level folder structure without seeing other users' files. The `delimiter` condition makes the listing behave like a directory view.

## Dynamic DynamoDB Access

You can use policy variables to restrict DynamoDB access based on the user's identity:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowAccessToOwnItems",
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query"
            ],
            "Resource": "arn:aws:dynamodb:*:*:table/UserData",
            "Condition": {
                "ForAllValues:StringEquals": {
                    "dynamodb:LeadingKeys": ["${aws:userid}"]
                }
            }
        }
    ]
}
```

The `dynamodb:LeadingKeys` condition restricts users to items where the partition key matches their user ID. Each user can only access their own records in the table.

## Team-Based Resource Access with Principal Tags

Tag variables enable powerful team-based access patterns:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowTeamEC2Access",
            "Effect": "Allow",
            "Action": [
                "ec2:StartInstances",
                "ec2:StopInstances",
                "ec2:DescribeInstances"
            ],
            "Resource": "*",
            "Condition": {
                "StringEquals": {
                    "ec2:ResourceTag/Team": "${aws:PrincipalTag/Team}",
                    "ec2:ResourceTag/Environment": "${aws:PrincipalTag/Environment}"
                }
            }
        },
        {
            "Sid": "AllowTeamS3Access",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::project-${aws:PrincipalTag/Team}-*",
                "arn:aws:s3:::project-${aws:PrincipalTag/Team}-*/*"
            ]
        }
    ]
}
```

For the EC2 part, the user's Team and Environment tags must match the resource's tags. For S3, the bucket name must start with `project-` followed by the user's team name. This means team "alpha" can access `project-alpha-data`, `project-alpha-logs`, etc.

## Using Variables in Resource ARNs

Policy variables can appear in resource ARNs, which is incredibly powerful:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowManageOwnAccessKeys",
            "Effect": "Allow",
            "Action": [
                "iam:CreateAccessKey",
                "iam:DeleteAccessKey",
                "iam:ListAccessKeys",
                "iam:UpdateAccessKey"
            ],
            "Resource": "arn:aws:iam::*:user/${aws:username}"
        },
        {
            "Sid": "AllowManageOwnMFA",
            "Effect": "Allow",
            "Action": [
                "iam:CreateVirtualMFADevice",
                "iam:EnableMFADevice",
                "iam:DeactivateMFADevice",
                "iam:DeleteVirtualMFADevice",
                "iam:ListMFADevices",
                "iam:ResyncMFADevice"
            ],
            "Resource": [
                "arn:aws:iam::*:user/${aws:username}",
                "arn:aws:iam::*:mfa/${aws:username}"
            ]
        }
    ]
}
```

This lets users manage their own credentials and MFA devices without being able to touch anyone else's.

## Cross-Account Variable Usage

In cross-account scenarios, `${aws:PrincipalAccount}` is useful for building policies that adapt to the source account:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCrossAccountS3",
            "Effect": "Allow",
            "Action": ["s3:GetObject", "s3:PutObject"],
            "Resource": "arn:aws:s3:::shared-data/accounts/${aws:PrincipalAccount}/*"
        }
    ]
}
```

Each account gets its own prefix in the shared bucket, automatically.

## Default Values for Missing Variables

If a policy variable references a tag or attribute that doesn't exist, the variable resolves to an empty string. This can cause unexpected behavior. Always ensure your users and roles have the required tags before deploying ABAC policies.

You can add a safeguard with a condition that checks for the tag's existence:

```json
{
    "Sid": "DenyIfMissingTeamTag",
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
        "Null": {
            "aws:PrincipalTag/Team": "true"
        }
    }
}
```

This denies all actions if the caller doesn't have a Team tag, preventing the empty-string fallback from causing problems.

## Terraform with Policy Variables

When using policy variables in Terraform, escape the dollar sign:

```hcl
# Terraform requires double-dollar for IAM policy variables
resource "aws_iam_policy" "user_home_directory" {
  name = "UserHomeDirectory"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowOwnFolder"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "arn:aws:s3:::company-shared/home/$${aws:username}/*"
      }
    ]
  })
}
```

The `$$` becomes a single `$` in the output, producing the correct `${aws:username}` syntax.

## Wrapping Up

Policy variables eliminate the need for per-user policies. Whether you're building home directories, team-based access controls, or self-service IAM management, variables make your policies dynamic and maintainable. Start with `${aws:username}` for basic user isolation, then move to `${aws:PrincipalTag/*}` for full ABAC. And always add null checks to handle cases where variables might be missing. For a broader look at tag-based access, see our guide on [writing IAM policy conditions for tag-based access control](https://oneuptime.com/blog/post/2026-02-12-write-iam-policy-conditions-for-tag-based-access-control/view).
