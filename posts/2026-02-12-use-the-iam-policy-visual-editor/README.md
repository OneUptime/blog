# How to Use the IAM Policy Visual Editor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, Policies

Description: A walkthrough of the AWS IAM Policy Visual Editor for creating and editing IAM policies without writing JSON by hand, including tips for common scenarios.

---

Writing IAM policies in raw JSON is powerful but error-prone. One misplaced comma, one wrong ARN format, and your policy either doesn't work or grants more access than intended. The IAM Policy Visual Editor gives you a point-and-click interface for building policies, with dropdowns for services, actions, and resources. It's not just for beginners - even experienced AWS users use it to explore available actions and double-check their work.

Let's walk through using the visual editor to build real policies, and look at when it's the right tool versus when you should stick to JSON.

## Accessing the Visual Editor

Navigate to the IAM console, click "Policies" in the sidebar, then "Create policy." You'll see two tabs at the top: "Visual" and "JSON." The visual editor is the default view.

The editor is organized into blocks, where each block represents one statement in your policy. Each block has four main sections:

1. **Service** - which AWS service you're granting access to
2. **Actions** - which API actions to allow or deny
3. **Resources** - which specific resources the actions apply to
4. **Request conditions** - optional constraints

## Building Your First Policy

Let's create a policy that allows a developer to manage objects in a specific S3 bucket.

**Step 1: Choose the service.**
Click "Choose a service" and type "S3". Select "S3" from the dropdown.

**Step 2: Select actions.**
The editor organizes actions into categories: List, Read, Write, Permissions management, and Tagging. This grouping is really helpful because it maps to how you think about access.

For our policy, expand "List" and check "ListBucket". Then expand "Read" and check "GetObject". Expand "Write" and check "PutObject" and "DeleteObject".

**Step 3: Specify resources.**
The editor knows which resource types each action applies to. For ListBucket, it shows "bucket" as the resource type. Click "Add ARN" next to bucket and enter your bucket name. For GetObject, PutObject, and DeleteObject, it shows "object" as the resource type. Click "Add ARN" next to object, enter your bucket name, and use `*` for the object name to allow access to all objects.

**Step 4: Add conditions (optional).**
Click "Add condition" if you want to restrict access further. For example, you could add an IP restriction by choosing the `aws:SourceIp` condition key.

After completing these steps, the visual editor generates the equivalent JSON behind the scenes. Click the "JSON" tab to see it:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::my-app-bucket",
                "arn:aws:s3:::my-app-bucket/*"
            ]
        }
    ]
}
```

The visual editor automatically handles the ARN format differences between bucket-level and object-level actions, which is one of the most common sources of errors in hand-written policies.

## Adding Multiple Statement Blocks

Real policies often need multiple statements. Click "Add more permissions" at the bottom to add another block. Each block becomes a separate statement in the policy.

For example, you might add a second block for CloudWatch access:

- Service: CloudWatch
- Actions: Under "Read", check "GetMetricData", "GetDashboard", "ListMetrics"
- Resources: All resources (some CloudWatch actions don't support resource-level permissions)

And a third block for CloudWatch Logs:

- Service: CloudWatch Logs
- Actions: Under "Read", check "GetLogEvents", "FilterLogEvents", "DescribeLogGroups"
- Resources: All resources or specific log group ARNs

## Using the Action Search

The action list for major services like EC2 can be enormous. The search box at the top of the actions section filters as you type. Try typing "instance" in the EC2 service to see only actions related to instances, or "security group" to see just those.

You can also use the access level filters to quickly select all read actions or all write actions for a service. This is particularly useful when building read-only policies.

## Switching Between Visual and JSON

One of the best features of the visual editor is that you can switch between visual and JSON modes at any time. Start in visual mode to build the structure, then switch to JSON to fine-tune. Or paste in existing JSON and switch to visual mode to understand what it does.

Here's a workflow that works well:

1. Start in visual mode to set up the basic structure
2. Switch to JSON to add complex conditions or policy variables
3. Switch back to visual mode to verify everything looks right
4. Review the final JSON before saving

There are some limitations to be aware of. The visual editor doesn't handle every policy construct. For example, if your JSON uses policy variables like `${aws:username}`, the visual editor may show a warning. You can still save the policy, but you'll need to edit that part in JSON mode.

## Exploring Available Actions

One thing the visual editor excels at is discovery. You might not know exactly which actions a service offers. By clicking through the service list and expanding the action categories, you can explore everything that's available.

For example, you might not know that S3 has separate actions for `s3:GetObjectVersion` and `s3:GetObject`, or that DynamoDB has `dynamodb:PartiQLSelect` for SQL-compatible queries. The visual editor surfaces all of these.

## Practical Example: Developer Policy

Let's build a more complete developer policy using the visual editor. We'll need access to several services.

**Block 1 - S3 access for application buckets:**
- Service: S3
- Actions: ListBucket, GetObject, PutObject, DeleteObject
- Resources: Bucket `dev-app-*`, Objects `dev-app-*/*`

**Block 2 - EC2 read-only:**
- Service: EC2
- Actions: All "List" and "Read" actions (use the access level filter)
- Resources: All

**Block 3 - Lambda management:**
- Service: Lambda
- Actions: GetFunction, ListFunctions, UpdateFunctionCode, InvokeFunction
- Resources: Functions matching `arn:aws:lambda:us-east-1:*:function:dev-*`

**Block 4 - CloudWatch monitoring:**
- Service: CloudWatch
- Actions: All "Read" actions
- Resources: All

The resulting JSON would look something like this:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3DevAccess",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::dev-app-*",
                "arn:aws:s3:::dev-app-*/*"
            ]
        },
        {
            "Sid": "EC2ReadOnly",
            "Effect": "Allow",
            "Action": [
                "ec2:Describe*",
                "ec2:Get*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "LambdaDevAccess",
            "Effect": "Allow",
            "Action": [
                "lambda:GetFunction",
                "lambda:ListFunctions",
                "lambda:UpdateFunctionCode",
                "lambda:InvokeFunction"
            ],
            "Resource": "arn:aws:lambda:us-east-1:*:function:dev-*"
        },
        {
            "Sid": "CloudWatchRead",
            "Effect": "Allow",
            "Action": [
                "cloudwatch:Get*",
                "cloudwatch:List*",
                "cloudwatch:Describe*"
            ],
            "Resource": "*"
        }
    ]
}
```

## Validating Policies

The visual editor runs basic validation as you build. It'll flag issues like invalid ARN formats or actions that don't exist. But it won't catch logical errors like granting too much access.

For deeper testing, use the IAM Policy Simulator after creating your policy. We have a detailed walkthrough in our guide on [using the IAM Policy Simulator to test permissions](https://oneuptime.com/blog/post/2026-02-12-use-iam-policy-simulator-to-test-permissions/view).

## When to Use the Visual Editor vs JSON

The visual editor is great for:
- Exploring what actions are available for a service
- Building policies when you're not sure of the exact action names
- Quickly creating simple policies
- Teaching team members about IAM policy structure

Stick with JSON when you need:
- Policy variables like `${aws:username}`
- Complex condition blocks with multiple operators
- Copying policies between accounts or environments
- Version-controlled policies in your Git repository
- Policies managed by Terraform or CloudFormation

Most experienced teams write policies in JSON (often via Terraform) but use the visual editor as a reference tool when they need to look up action names or resource ARN formats.

## Wrapping Up

The IAM Policy Visual Editor lowers the barrier to creating correct IAM policies. It handles ARN formatting, shows available actions, and catches basic errors before you save. Use it as a learning tool when you're getting started, and as a quick reference even after you've moved to managing policies as code. The key is knowing when to switch to JSON for the things the visual editor can't handle cleanly.
