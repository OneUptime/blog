# How to Configure IPv6 for AWS Lambda

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, Lambda, Serverless, VPC, Function URLs

Description: Enable IPv6 for AWS Lambda functions, configure VPC-attached functions to use dual-stack subnets, and expose functions via IPv6-capable Function URLs or API Gateway.

## Introduction

AWS Lambda supports IPv6 in two contexts: Lambda Function URLs, which are dual-stack by default and support direct IPv6 invocation, and VPC-connected Lambda functions that can make outbound IPv6 connections from dual-stack subnets when `Ipv6AllowedForDualStack` is enabled. IPv6 in Lambda is particularly useful for functions that call IPv6-only endpoints from dual-stack VPC environments.

## Lambda Function URLs with IPv6

```bash
# Create a Lambda function URL
FUNCTION_NAME="my-function"

aws lambda create-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --auth-type NONE \
    --invoke-mode BUFFERED

# For AWS CLI-created public function URLs, add both permissions
aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id FunctionURLAllowPublicAccess \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE

aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id FunctionURLInvokeAllowPublicAccess \
    --action lambda:InvokeFunction \
    --principal "*" \
    --invoked-via-function-url

# Get the function URL
aws lambda get-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --query "FunctionUrl"

# Function URLs are dual-stack by default, so IPv6 clients can invoke them directly
FUNCTION_URL="https://abc123.lambda-url.us-east-1.on.aws/"
curl -6 "$FUNCTION_URL"
```

## Terraform Lambda with IPv6

```hcl
# lambda_ipv6.tf

resource "aws_lambda_function" "api" {
  filename         = "function.zip"
  function_name    = "ipv6-api"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = filebase64sha256("function.zip")

  # VPC configuration for IPv6 outbound
  vpc_config {
    subnet_ids = [
      aws_subnet.private_a.id,  # Dual-stack subnets
      aws_subnet.private_b.id,
    ]
    security_group_ids = [aws_security_group.lambda.id]
    ipv6_allowed_for_dual_stack = true
  }

  environment {
    variables = {
      STAGE = "production"
    }
  }

  tags = { Name = "ipv6-api-lambda" }
}

# Function URL for direct invocation (dual-stack by default)
resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "AWS_IAM"

  # CORS configuration
  cors {
    allow_credentials = true
    allow_origins     = ["https://example.com"]
    allow_methods     = ["GET", "POST"]
    allow_headers     = ["Content-Type"]
    max_age           = 300
  }
}

# Security group for Lambda
resource "aws_security_group" "lambda" {
  vpc_id = aws_vpc.main.id
  name   = "lambda-sg"

  # Allow all outbound (IPv4 + IPv6)
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = { Name = "lambda-sg" }
}

output "function_url" {
  value = aws_lambda_function_url.api.function_url
}
```

## Lambda Function Making IPv6 Outbound Calls

```javascript
// Lambda function that makes IPv6 outbound requests
const https = require('https');

exports.handler = async (event) => {
    // This Lambda is in dual-stack subnets with
    // ipv6_allowed_for_dual_stack enabled

    const options = {
        hostname: 'ipv6.icanhazip.com',
        port: 443,
        path: '/',
        method: 'GET',
        family: 6  // Force IPv6 (Node.js net.connect option)
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: 200,
                    body: JSON.stringify({
                        ipv6_address: data.trim(),
                        message: 'Lambda made IPv6 outbound connection'
                    })
                });
            });
        });

        req.on('error', reject);
        req.end();
    });
};
```

## API Gateway with IPv6

```bash
# API Gateway HTTP APIs can expose dual-stack endpoints directly

# 1. Create API Gateway HTTP API with dual-stack IP address support
API_ID=$(aws apigatewayv2 create-api \
    --name ipv6-api \
    --protocol-type HTTP \
    --ip-address-type dualstack \
    --query "ApiId" \
    --output text)

# 2. Get the API endpoint and confirm the IP address type
aws apigatewayv2 get-api \
    --api-id "$API_ID" \
    --query "{ApiEndpoint:ApiEndpoint,IpAddressType:IpAddressType}"
```

## Lambda VPC IPv6 Outbound

```bash
# For Lambda in VPC to make IPv6 outbound calls:
# 1. Lambda must be in dual-stack subnets
# 2. Enable Ipv6AllowedForDualStack on the function VPC config
# 3. Subnet route table must have ::/0 → EIGW for outbound-only internet access
# 4. Lambda security group must allow IPv6 egress

aws lambda update-function-configuration \
    --function-name my-function \
    --vpc-config Ipv6AllowedForDualStack=true,SubnetIds=subnet-12345678,subnet-abcdef12,SecurityGroupIds=sg-12345678
```

## Conclusion

Lambda IPv6 support comes through two paths: Function URLs, which are dual-stack by default and can be accessed over IPv4 or IPv6, and VPC-connected functions that can make outbound IPv6 connections through dual-stack subnets when `Ipv6AllowedForDualStack` is enabled. For public IPv6 access to API-style Lambda functions, use Lambda Function URLs or configure API Gateway with a dualstack IP address type. CloudFront is optional, not required for IPv6 support. For VPC-connected functions, IPv6 behavior depends on the function's VPC configuration plus the subnet routing and security group rules.
