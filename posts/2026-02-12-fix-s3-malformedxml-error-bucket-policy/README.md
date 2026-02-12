# How to Fix S3 'MalformedXML' Error in Bucket Policy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Troubleshooting, IAM

Description: Fix the MalformedXML error when applying S3 bucket policies, covering JSON syntax issues, common policy structure mistakes, and validation tools.

---

You're trying to set a bucket policy on your S3 bucket and you get:

```
An error occurred (MalformedPolicy) when calling the PutBucketPolicy operation:
This policy contains invalid Json
```

Or sometimes:

```
MalformedXML: The XML you provided was not well-formed or did not validate
against our published schema
```

Despite the "XML" mention, S3 bucket policies are JSON, not XML. The MalformedXML error for bucket policies almost always means your JSON is broken or the policy structure doesn't match what AWS expects. Let's fix it.

## Common Cause 1: Invalid JSON Syntax

The most frequent cause is a simple JSON syntax error. Missing commas, extra commas, unmatched brackets, or missing quotes.

Here's a broken policy - can you spot the error?

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-bucket"
    }
  ]
}
```

The fix: there's a missing comma between the two statement objects. It should be `},` not just `}` after the first statement:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    },
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-bucket"
    }
  ]
}
```

### Validate Your JSON First

Before applying any bucket policy, validate the JSON:

```bash
# Validate JSON syntax with Python
echo '{"Version":"2012-10-17","Statement":[]}' | python3 -m json.tool

# Or validate a policy file
python3 -m json.tool policy.json

# Using jq
cat policy.json | jq .
```

If the JSON is valid, these commands will pretty-print it. If it's invalid, they'll tell you exactly where the error is.

## Common Cause 2: Wrong Version String

The policy `Version` must be exactly `"2012-10-17"`. Any other value will cause an error:

```json
{
  "Version": "2012-10-17",
  "Statement": []
}
```

Not `"2023-01-01"`, not `"1.0"`, not anything else. The version string refers to the IAM policy language version, not the date you wrote the policy.

## Common Cause 3: Missing Required Fields

Every statement in a bucket policy must have these fields: `Effect`, `Principal`, `Action`, and `Resource`.

Missing any of them causes an error:

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

This is missing `Principal`. For bucket policies (unlike IAM policies), `Principal` is required:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

## Common Cause 4: Invalid Principal Format

The `Principal` field has specific formatting requirements:

```json
// Valid principal formats:
"Principal": "*"
"Principal": {"AWS": "arn:aws:iam::123456789012:root"}
"Principal": {"AWS": ["arn:aws:iam::123456789012:root", "arn:aws:iam::987654321098:root"]}
"Principal": {"Service": "cloudfront.amazonaws.com"}

// INVALID formats:
"Principal": "arn:aws:iam::123456789012:root"     // Must be wrapped in {"AWS": ...}
"Principal": {"IAM": "arn:aws:iam::123456789012:root"}  // Wrong key, should be "AWS"
```

Here's a correct policy with a specific IAM principal:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/MyRole"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

## Common Cause 5: Invalid Resource ARN

The resource ARN must match the bucket name in your policy. And remember - bucket-level actions (like `ListBucket`) use the bucket ARN, while object-level actions (like `GetObject`) use the bucket ARN with `/*`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-bucket"
    },
    {
      "Sid": "AllowGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

Common ARN mistakes:
- `arn:aws:s3:::my-bucket/` (trailing slash without asterisk)
- `arn:aws:s3::my-bucket` (only two colons before bucket name, need three)
- `arn:aws:s3:::my-bucket*` (missing the slash before asterisk)

## Common Cause 6: Shell Escaping Issues

When applying policies via the AWS CLI, shell escaping can corrupt the JSON:

```bash
# This often fails because of shell escaping
aws s3api put-bucket-policy --bucket my-bucket --policy '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::my-bucket/*"}]}'

# Better approach: use a file
aws s3api put-bucket-policy --bucket my-bucket --policy file://policy.json
```

Using a file avoids all shell escaping problems. Save your policy to `policy.json` first, validate it, then apply it.

```bash
# Create the policy file
cat > /tmp/policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
EOF

# Validate it
python3 -m json.tool /tmp/policy.json

# Apply it
aws s3api put-bucket-policy --bucket my-bucket --policy file:///tmp/policy.json
```

## Common Cause 7: Condition Block Syntax Errors

Conditions are where things get tricky. The nested structure is easy to mess up:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

Common condition mistakes:
- Using `"false"` as a boolean instead of a string (it must be the string `"false"`, not the boolean `false`)
- Nesting conditions incorrectly
- Using an invalid condition operator

## Using the IAM Policy Validator

AWS provides a policy validation API that gives you detailed error messages:

```bash
# Validate a bucket policy using IAM Access Analyzer
aws accessanalyzer validate-policy \
  --policy-document file:///tmp/policy.json \
  --policy-type RESOURCE_POLICY \
  --query 'findings[*].{Type:findingType,Message:findingDetails}'
```

This tool checks not just JSON syntax but also semantic issues like invalid actions, malformed ARNs, and policy logic problems. It's much more helpful than the generic "MalformedPolicy" error.

## Quick Fix Checklist

When you hit a MalformedPolicy or MalformedXML error:

1. Validate JSON syntax with `python3 -m json.tool` or `jq`
2. Check `Version` is `"2012-10-17"`
3. Every statement needs `Effect`, `Principal`, `Action`, `Resource`
4. Principal format must be `"*"` or `{"AWS": "arn:..."}`
5. Resource ARNs must have three colons before the bucket name
6. Use `file://` to load policies from a file instead of inline
7. Condition values should be strings (`"true"` not `true`)

For ongoing policy management, consider using infrastructure as code tools like Terraform or CloudFormation, which validate policies before applying them. And set up monitoring with [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) to catch policy-related access issues in production.
