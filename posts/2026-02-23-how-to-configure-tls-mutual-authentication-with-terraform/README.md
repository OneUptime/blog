# How to Configure TLS Mutual Authentication with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, TLS, mTLS, Security, API Gateway, Infrastructure as Code

Description: Learn how to configure TLS mutual authentication (mTLS) with Terraform for API Gateway and Application Load Balancers, ensuring both client and server identity verification.

---

TLS mutual authentication, commonly known as mTLS, requires both the client and the server to present certificates during the TLS handshake. While standard TLS only verifies the server's identity, mTLS adds client certificate verification, providing a much stronger security model. This guide covers implementing mTLS with Terraform across AWS API Gateway and Application Load Balancers.

## What Is Mutual TLS?

In standard TLS, only the server presents a certificate to prove its identity. The client verifies this certificate but does not present one of its own. In mutual TLS, both parties present certificates. The server verifies the client's certificate against a trusted Certificate Authority (CA), and the client verifies the server's certificate. This two-way verification ensures that both endpoints are who they claim to be.

mTLS is commonly used in microservices communication, B2B API integrations, zero-trust architectures, and IoT device authentication.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, familiarity with PKI (Public Key Infrastructure) concepts, and your own CA certificates. For testing purposes, we will show how to generate self-signed certificates.

## Generating Test Certificates

Before configuring Terraform, you need certificates. Here is how to generate them for testing.

```bash
# Generate a CA private key
openssl genrsa -out ca.key 4096

# Generate a self-signed CA certificate
openssl req -new -x509 -days 365 -key ca.key -out ca.crt \
  -subj "/CN=My Test CA/O=My Organization"

# Generate a client private key
openssl genrsa -out client.key 2048

# Generate a client certificate signing request
openssl req -new -key client.key -out client.csr \
  -subj "/CN=my-client/O=My Organization"

# Sign the client certificate with the CA
openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out client.crt

# Create the truststore PEM file (contains the CA certificate)
cp ca.crt truststore.pem
```

## mTLS with API Gateway (HTTP API)

AWS HTTP APIs (API Gateway v2) natively support mutual TLS. The truststore containing your CA certificates is stored in S3.

```hcl
provider "aws" {
  region = "us-east-1"
}

# S3 bucket to store the truststore
resource "aws_s3_bucket" "truststore" {
  bucket = "mtls-truststore-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name    = "mtls-truststore"
    Purpose = "Store CA certificates for mTLS"
  }
}

# Block public access to the truststore bucket
resource "aws_s3_bucket_public_access_block" "truststore" {
  bucket = aws_s3_bucket.truststore.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Upload the truststore PEM file containing CA certificates
resource "aws_s3_object" "truststore" {
  bucket = aws_s3_bucket.truststore.id
  key    = "truststore.pem"
  source = "${path.module}/certs/truststore.pem"
  etag   = filemd5("${path.module}/certs/truststore.pem")
}

data "aws_caller_identity" "current" {}

# ACM certificate for the custom domain
resource "aws_acm_certificate" "api" {
  domain_name       = "secure-api.example.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "mtls-api-certificate"
  }
}

# HTTP API with mutual TLS
resource "aws_apigatewayv2_api" "mtls" {
  name          = "mtls-api"
  protocol_type = "HTTP"
  description   = "API with mutual TLS authentication"
}

# Custom domain with mTLS enabled
resource "aws_apigatewayv2_domain_name" "mtls" {
  domain_name = "secure-api.example.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.api.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  # Enable mutual TLS by specifying the truststore
  mutual_tls_authentication {
    truststore_uri     = "s3://${aws_s3_bucket.truststore.id}/${aws_s3_object.truststore.key}"
    truststore_version = aws_s3_object.truststore.version_id
  }

  depends_on = [aws_s3_object.truststore]
}

# API mapping
resource "aws_apigatewayv2_api_mapping" "mtls" {
  api_id      = aws_apigatewayv2_api.mtls.id
  domain_name = aws_apigatewayv2_domain_name.mtls.id
  stage       = aws_apigatewayv2_stage.default.id
}

# Default stage
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.mtls.id
  name        = "$default"
  auto_deploy = true
}
```

## Adding a Lambda Authorizer for Certificate Validation

For more granular control, use a Lambda authorizer to inspect client certificate details.

```hcl
# Lambda function for certificate-based authorization
resource "aws_lambda_function" "cert_authorizer" {
  filename         = "cert_authorizer.zip"
  function_name    = "mtls-cert-authorizer"
  role             = aws_iam_role.lambda_authorizer.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256("cert_authorizer.zip")

  environment {
    variables = {
      ALLOWED_SUBJECTS = "CN=my-client,O=My Organization"
    }
  }

  tags = {
    Name = "mtls-cert-authorizer"
  }
}

# IAM role for the Lambda authorizer
resource "aws_iam_role" "lambda_authorizer" {
  name = "mtls-lambda-authorizer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach basic execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_authorizer.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# API Gateway authorizer using the Lambda function
resource "aws_apigatewayv2_authorizer" "cert" {
  api_id           = aws_apigatewayv2_api.mtls.id
  authorizer_type  = "REQUEST"
  authorizer_uri   = aws_lambda_function.cert_authorizer.invoke_arn
  name             = "cert-authorizer"
  identity_sources = ["$context.identity.clientCert.subjectDN"]

  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
}

# Permission for API Gateway to invoke the Lambda
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cert_authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.mtls.execution_arn}/*"
}
```

## mTLS with Application Load Balancer

ALBs can also verify client certificates using a trust store.

```hcl
# Create the ALB trust store
resource "aws_lb_trust_store" "mtls" {
  name                             = "mtls-trust-store"
  ca_certificates_bundle_s3_bucket = aws_s3_bucket.truststore.id
  ca_certificates_bundle_s3_key    = aws_s3_object.truststore.key

  tags = {
    Name = "mtls-trust-store"
  }
}

# Application Load Balancer
resource "aws_lb" "mtls" {
  name               = "mtls-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "mtls-alb"
  }
}

# HTTPS listener with mutual authentication
resource "aws_lb_listener" "mtls" {
  load_balancer_arn = aws_lb.mtls.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.api.arn

  # Configure mutual authentication
  mutual_authentication {
    mode            = "verify"  # Options: verify, passthrough, off
    trust_store_arn = aws_lb_trust_store.mtls.arn
  }

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Target group for backend instances
resource "aws_lb_target_group" "app" {
  name     = "mtls-app-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 30
  }
}

# Security group for the ALB
resource "aws_security_group" "alb" {
  name_prefix = "mtls-alb-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS with mTLS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Certificate Revocation List (CRL)

Add a Certificate Revocation List to invalidate compromised client certificates.

```hcl
# Upload the CRL to S3
resource "aws_s3_object" "crl" {
  bucket = aws_s3_bucket.truststore.id
  key    = "crl.pem"
  source = "${path.module}/certs/crl.pem"
  etag   = filemd5("${path.module}/certs/crl.pem")
}

# Trust store revocation list for ALB
resource "aws_lb_trust_store_revocation" "crl" {
  trust_store_arn = aws_lb_trust_store.mtls.arn
  revocations_s3_bucket = aws_s3_bucket.truststore.id
  revocations_s3_key    = aws_s3_object.crl.key
}
```

## Testing mTLS

After deploying, test the mTLS setup with curl.

```bash
# Test with client certificate (should succeed)
curl --cert client.crt --key client.key \
  https://secure-api.example.com/health

# Test without client certificate (should fail with 403)
curl https://secure-api.example.com/health

# Test with wrong certificate (should fail)
curl --cert wrong-client.crt --key wrong-client.key \
  https://secure-api.example.com/health
```

## Rotating Client Certificates

Plan for certificate rotation by updating the truststore with new CA certificates.

```hcl
# Variable to track truststore version
variable "truststore_file" {
  description = "Path to the truststore PEM file"
  type        = string
  default     = "certs/truststore.pem"
}

# Upload with versioning so old and new certificates work during rotation
resource "aws_s3_bucket_versioning" "truststore" {
  bucket = aws_s3_bucket.truststore.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

## Best Practices

Always use strong key sizes - 2048-bit RSA or 256-bit ECDSA minimum for client certificates. Keep your CA private key secure, preferably in AWS CloudHSM or a similar hardware security module. Implement certificate revocation using CRLs or OCSP to quickly disable compromised certificates.

Use separate CAs for different environments (development, staging, production) to prevent cross-environment access. Set appropriate certificate lifetimes and automate renewal processes.

## Conclusion

Mutual TLS provides robust two-way authentication for your APIs and services. With Terraform, you can automate the deployment of mTLS across API Gateway and Application Load Balancers, ensuring consistent security configuration. Combined with Lambda authorizers for granular certificate validation and CRLs for revocation, you have a complete mTLS solution.

For more security-related Terraform configurations, check out our guide on [How to Create Network Load Balancer with TLS in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-network-load-balancer-with-tls-in-terraform/view).
