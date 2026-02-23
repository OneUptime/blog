# How to Create Lambda@Edge Functions with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, CloudFront, Serverless, Edge Computing

Description: Learn how to create and deploy Lambda@Edge functions using Terraform to customize content delivery at AWS CloudFront edge locations worldwide.

---

Lambda@Edge allows you to run serverless functions at AWS CloudFront edge locations, bringing your compute logic closer to end users. This drastically reduces latency for tasks like request manipulation, authentication, A/B testing, and dynamic content generation. Managing Lambda@Edge with Terraform ensures your edge infrastructure is reproducible, version-controlled, and easy to maintain.

In this guide, we will walk through the complete process of creating Lambda@Edge functions with Terraform, from provider configuration to deployment and testing.

## Understanding Lambda@Edge

Lambda@Edge functions are special AWS Lambda functions that run in response to CloudFront events. There are four event types you can hook into:

- **Viewer Request**: Triggered after CloudFront receives a request from a viewer.
- **Viewer Response**: Triggered before CloudFront returns a response to a viewer.
- **Origin Request**: Triggered before CloudFront forwards a request to the origin.
- **Origin Response**: Triggered after CloudFront receives a response from the origin.

A critical requirement is that Lambda@Edge functions must be created in the `us-east-1` region. Terraform makes it easy to handle this with provider aliases.

## Setting Up Terraform Providers

Since Lambda@Edge functions must reside in `us-east-1`, you need to configure an aliased provider:

```hcl
# Main provider for your primary region
provider "aws" {
  region = "us-west-2"
}

# Provider alias for Lambda@Edge (must be us-east-1)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
```

## Creating the IAM Role

Lambda@Edge functions need an IAM role that allows both Lambda and the edge location service to assume it:

```hcl
# IAM role for Lambda@Edge
resource "aws_iam_role" "lambda_edge_role" {
  provider = aws.us_east_1
  name     = "lambda-edge-execution-role"

  # Trust policy allowing Lambda and edge locations to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"
          ]
        }
      }
    ]
  })
}

# Attach basic execution policy for CloudWatch logging
resource "aws_iam_role_policy_attachment" "lambda_edge_basic" {
  provider   = aws.us_east_1
  role       = aws_iam_role.lambda_edge_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

## Writing the Lambda@Edge Function Code

Create a directory for your function code. Here is an example that adds security headers to viewer responses:

```javascript
// lambda-edge/index.js
// This function adds security headers to all CloudFront responses
exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;

  // Add strict transport security header
  headers['strict-transport-security'] = [{
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubdomains; preload'
  }];

  // Add content type options header to prevent MIME sniffing
  headers['x-content-type-options'] = [{
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }];

  // Add frame options header to prevent clickjacking
  headers['x-frame-options'] = [{
    key: 'X-Frame-Options',
    value: 'DENY'
  }];

  // Add XSS protection header
  headers['x-xss-protection'] = [{
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }];

  return response;
};
```

## Creating the Lambda@Edge Function with Terraform

Now define the Lambda function and package the code:

```hcl
# Package the Lambda function code into a zip file
data "archive_file" "lambda_edge_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda-edge"
  output_path = "${path.module}/lambda-edge.zip"
}

# Create the Lambda@Edge function in us-east-1
resource "aws_lambda_function" "edge_security_headers" {
  provider         = aws.us_east_1
  filename         = data.archive_file.lambda_edge_zip.output_path
  function_name    = "cloudfront-security-headers"
  role             = aws_iam_role.lambda_edge_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda_edge_zip.output_base64sha256
  runtime          = "nodejs18.x"
  publish          = true  # Lambda@Edge requires published versions

  # Lambda@Edge has specific limits
  memory_size = 128
  timeout     = 5  # Maximum 5 seconds for viewer events, 30 for origin events
}
```

Note that `publish = true` is essential. Lambda@Edge requires a published version, not the `$LATEST` alias.

## Attaching Lambda@Edge to CloudFront

Connect the Lambda function to your CloudFront distribution:

```hcl
# CloudFront distribution with Lambda@Edge association
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "S3Origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"

    # Associate the Lambda@Edge function with viewer response events
    lambda_function_association {
      event_type   = "viewer-response"
      lambda_arn   = aws_lambda_function.edge_security_headers.qualified_arn
      include_body = false
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

## Adding Multiple Lambda@Edge Functions

You can associate different functions with different event types:

```hcl
# URL rewrite function for origin requests
resource "aws_lambda_function" "edge_url_rewrite" {
  provider         = aws.us_east_1
  filename         = data.archive_file.url_rewrite_zip.output_path
  function_name    = "cloudfront-url-rewrite"
  role             = aws_iam_role.lambda_edge_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.url_rewrite_zip.output_base64sha256
  runtime          = "nodejs18.x"
  publish          = true
  memory_size      = 128
  timeout          = 30  # Origin events allow up to 30 seconds
}

# Cache behavior with multiple Lambda@Edge associations
default_cache_behavior {
  # ... other settings ...

  # Security headers on viewer response
  lambda_function_association {
    event_type   = "viewer-response"
    lambda_arn   = aws_lambda_function.edge_security_headers.qualified_arn
    include_body = false
  }

  # URL rewriting on origin request
  lambda_function_association {
    event_type   = "origin-request"
    lambda_arn   = aws_lambda_function.edge_url_rewrite.qualified_arn
    include_body = false
  }
}
```

## Useful Outputs

Export the function ARNs and CloudFront distribution details:

```hcl
output "lambda_edge_function_arn" {
  description = "ARN of the Lambda@Edge security headers function"
  value       = aws_lambda_function.edge_security_headers.qualified_arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}
```

## Key Limitations to Remember

When working with Lambda@Edge, keep these constraints in mind:

1. Functions must be deployed to `us-east-1`.
2. Environment variables are not supported in Lambda@Edge.
3. The function must be a published version, not `$LATEST`.
4. Viewer-triggered functions have a 5-second timeout and 128 MB memory limit.
5. Origin-triggered functions have a 30-second timeout and 10,240 MB memory limit.
6. You cannot delete a Lambda@Edge function until CloudFront has fully replicated the removal across all edge locations, which can take several hours.

## Monitoring with OneUptime

After deploying your Lambda@Edge functions, monitoring them is important since they execute across distributed edge locations. OneUptime provides centralized monitoring for your serverless infrastructure. You can track function invocations, errors, and latency from a single dashboard. Visit [OneUptime](https://oneuptime.com) to set up monitoring for your Lambda@Edge deployments.

## Conclusion

Lambda@Edge with Terraform gives you a powerful combination of edge computing and infrastructure as code. By defining your edge functions, IAM roles, and CloudFront associations in Terraform, you maintain a clear, auditable record of your edge infrastructure. The key points to remember are deploying to `us-east-1`, publishing versions, and respecting the runtime constraints for each event type. With these patterns in place, you can confidently deploy security headers, URL rewrites, authentication logic, and more at the edge.

For more Terraform guides, check out our posts on [How to Create Step Functions Workflows with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-step-functions-workflows-with-terraform/view) and [How to Create Serverless API Backend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-serverless-api-backend-with-terraform/view).
