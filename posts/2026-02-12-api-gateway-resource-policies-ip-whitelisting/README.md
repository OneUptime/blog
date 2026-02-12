# How to Use API Gateway Resource Policies for IP Whitelisting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Security, Networking

Description: Learn how to use API Gateway resource policies to restrict API access by IP address, VPC, or AWS account for stronger security controls.

---

Sometimes you need to lock down an API to specific IP addresses - internal office networks, partner systems, or known infrastructure IPs. API Gateway resource policies let you do this at the gateway level, before any authorizer or Lambda function runs. It's the first line of defense and the most efficient way to block unwanted traffic.

## What Resource Policies Are

Resource policies are JSON policy documents attached to your API Gateway REST API. They work like S3 bucket policies or SQS queue policies - they define who can invoke the API and under what conditions. The policy gets evaluated before any other authorization mechanism.

You can use resource policies to:
- Allow or deny access based on source IP addresses
- Restrict access to specific VPCs or VPC endpoints
- Allow cross-account API access
- Combine IP restrictions with other conditions

## Basic IP Whitelist

The most common use case is restricting access to a set of known IP addresses or CIDR ranges.

Here's a policy that allows access only from specific IPs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:123456789012:abc123api/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": [
            "203.0.113.0/24",
            "198.51.100.42/32",
            "10.0.0.0/8"
          ]
        }
      }
    }
  ]
}
```

Apply the policy to your API:

```bash
# Attach the resource policy
aws apigateway update-rest-api \
  --rest-api-id abc123api \
  --patch-operations \
    op=replace,path=/policy,value='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":"execute-api:Invoke","Resource":"arn:aws:execute-api:us-east-1:123456789012:abc123api/*","Condition":{"IpAddress":{"aws:SourceIp":["203.0.113.0/24","198.51.100.42/32"]}}}]}'

# IMPORTANT: Redeploy the API for the policy to take effect
aws apigateway create-deployment \
  --rest-api-id abc123api \
  --stage-name prod
```

The redeployment step trips up a lot of people. Resource policy changes don't take effect until you create a new deployment.

## Deny-Based Policy (Blacklisting)

Instead of whitelisting, you can block specific IPs while allowing everyone else:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:123456789012:abc123api/*"
    },
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:123456789012:abc123api/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": [
            "192.0.2.0/24",
            "198.51.100.0/24"
          ]
        }
      }
    }
  ]
}
```

Note that you need both statements. The Allow gives everyone access, then the Deny blocks specific IPs. Explicit denies always win over allows.

## VPC-Only Access

You can restrict your API to only be accessible from specific VPCs through VPC endpoints:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:123456789012:abc123api/*",
      "Condition": {
        "StringNotEquals": {
          "aws:sourceVpc": "vpc-0abc123def456"
        }
      }
    },
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:123456789012:abc123api/*"
    }
  ]
}
```

Or restrict to a specific VPC endpoint:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:123456789012:abc123api/*",
      "Condition": {
        "StringNotEquals": {
          "aws:sourceVpce": "vpce-0abc123def456"
        }
      }
    },
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:123456789012:abc123api/*"
    }
  ]
}
```

## Cross-Account Access

Allow another AWS account to invoke your API:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::987654321098:root",
          "arn:aws:iam::987654321098:role/api-consumer-role"
        ]
      },
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:123456789012:abc123api/*"
    }
  ]
}
```

The calling account also needs an IAM policy that allows `execute-api:Invoke` on your API's ARN.

## Combining Conditions

You can combine multiple conditions for more granular control. This policy allows access only from specific IPs AND only during business hours:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:123456789012:abc123api/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": ["203.0.113.0/24"]
        },
        "DateGreaterThan": {
          "aws:CurrentTime": "2026-01-01T08:00:00Z"
        },
        "DateLessThan": {
          "aws:CurrentTime": "2026-12-31T18:00:00Z"
        }
      }
    }
  ]
}
```

## Per-Method Restrictions

You can restrict access to specific methods or paths rather than the entire API:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": [
        "arn:aws:execute-api:us-east-1:123456789012:abc123api/*/GET/*",
        "arn:aws:execute-api:us-east-1:123456789012:abc123api/*/OPTIONS/*"
      ]
    },
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": [
        "arn:aws:execute-api:us-east-1:123456789012:abc123api/*/POST/*",
        "arn:aws:execute-api:us-east-1:123456789012:abc123api/*/PUT/*",
        "arn:aws:execute-api:us-east-1:123456789012:abc123api/*/DELETE/*"
      ],
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": ["10.0.0.0/8"]
        }
      }
    }
  ]
}
```

This allows anyone to read (GET) but restricts write operations to internal IPs.

## CloudFormation Setup

Define the resource policy in CloudFormation:

```yaml
Resources:
  MyApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: secured-api
      Policy:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: "*"
            Action: execute-api:Invoke
            Resource: !Sub "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:*/*"
            Condition:
              IpAddress:
                aws:SourceIp:
                  - "203.0.113.0/24"
                  - "198.51.100.0/24"
```

## Terraform Configuration

```hcl
resource "aws_api_gateway_rest_api" "main" {
  name = "secured-api"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "execute-api:Invoke"
        Resource  = "arn:aws:execute-api:${var.region}:${var.account_id}:*/*"
        Condition = {
          IpAddress = {
            "aws:SourceIp" = var.allowed_ip_ranges
          }
        }
      }
    ]
  })
}

variable "allowed_ip_ranges" {
  type = list(string)
  default = [
    "203.0.113.0/24",
    "198.51.100.0/24",
  ]
}
```

## Managing IP Lists Dynamically

For environments where IP addresses change frequently, manage the allowed IPs in a parameter store and update the policy programmatically:

```python
import boto3
import json

ssm = boto3.client("ssm")
apigw = boto3.client("apigateway")


def update_ip_whitelist(api_id, stage_name):
    """Update API Gateway resource policy from Parameter Store."""

    # Get the current allowed IPs from SSM
    param = ssm.get_parameter(
        Name="/api/allowed-ips",
        WithDecryption=False,
    )
    allowed_ips = json.loads(param["Parameter"]["Value"])

    # Build the policy
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": "*",
                "Action": "execute-api:Invoke",
                "Resource": f"arn:aws:execute-api:*:*:{api_id}/*",
                "Condition": {
                    "IpAddress": {
                        "aws:SourceIp": allowed_ips,
                    }
                },
            }
        ],
    }

    # Update the API
    apigw.update_rest_api(
        restApiId=api_id,
        patchOperations=[
            {
                "op": "replace",
                "path": "/policy",
                "value": json.dumps(policy),
            }
        ],
    )

    # Redeploy
    apigw.create_deployment(
        restApiId=api_id,
        stageName=stage_name,
    )

    print(f"Updated whitelist with {len(allowed_ips)} IP ranges")
```

## Troubleshooting

When your resource policy isn't working as expected:

1. **Always redeploy** after changing the policy. Changes don't take effect without a new deployment.
2. **Check the resource ARN format** - it's `arn:aws:execute-api:region:account:api-id/stage/method/path`.
3. **Test from the right IP** - use `curl ifconfig.me` to verify your public IP.
4. **Watch for CloudFront** - if your API is behind CloudFront, the source IP is CloudFront's IP, not the client's.
5. **Check logs** - enable execution logging temporarily to see policy evaluation results.

For ongoing monitoring of blocked requests and security events on your APIs, see our post on [API monitoring best practices](https://oneuptime.com/blog/post/api-monitoring-best-practices/view).

## Wrapping Up

Resource policies are the most efficient way to restrict API access by IP. They evaluate before any other authorization, which means blocked requests never touch your authorizers or backend. The main thing to remember is the redeployment requirement - without it, your policy changes sit idle. For VPC-internal APIs, combine resource policies with VPC endpoints for the strongest isolation. And always test your policy from an IP that should be blocked to make sure the deny is working.
