# How to Configure AWS API Gateway with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, API Gateway, IPv6, Cloud, Dualstack, Terraform

Description: Enable IPv6 access for AWS API Gateway HTTP and REST APIs using dualstack endpoints, custom domains, and CloudFront integration.

## Introduction

AWS API Gateway supports IPv6 through dualstack IP address types for HTTP APIs, REST APIs, and custom domain names. For edge-optimized REST API custom domains, API Gateway manages the underlying CloudFront distribution for you, so you configure IPv6 in API Gateway rather than by editing CloudFront directly.

## HTTP API - Enable Dualstack Endpoint

AWS HTTP APIs (v2) support a built-in dualstack endpoint. Enable it at creation time or update an existing API.

```bash
# Create a new HTTP API with dualstack enabled

aws apigatewayv2 create-api \
  --name "MyIPv6API" \
  --protocol-type HTTP \
  --ip-address-type dualstack \
  --region us-east-1

# Update an existing HTTP API to dualstack
aws apigatewayv2 update-api \
  --api-id "abc123def" \
  --ip-address-type dualstack \
  --region us-east-1
```

After enabling dualstack, the default execute-api endpoint resolves both A and AAAA records.

## REST API - Enable Dualstack Endpoint

REST APIs support a native dualstack IP address type. Enable dualstack on the REST API itself, and if you use a public custom domain name, set the custom domain name to dualstack too.

### Step 1: Enable Dualstack on the REST API

```bash
# Create a new REST API with dualstack enabled
aws apigateway create-rest-api \
  --name "MyIPv6RestAPI" \
  --endpoint-configuration types=REGIONAL,ipAddressType=dualstack \
  --region us-east-1

# Update an existing REST API to dualstack
aws apigateway update-rest-api \
  --rest-api-id "abc123def" \
  --patch-operations "op='replace',path='/endpointConfiguration/ipAddressType',value='dualstack'" \
  --region us-east-1
```

### Step 2: Enable Dualstack on the Custom Domain Name

If you use a custom domain, configure the domain name for dualstack as well. For edge-optimized custom domains, API Gateway manages the CloudFront distribution, so update the domain name in API Gateway instead of editing CloudFront directly.

```bash
# Create a public custom domain name with dualstack enabled
aws apigateway create-domain-name \
  --domain-name api.example.com \
  --endpoint-configuration types=EDGE,ipAddressType=dualstack \
  --certificate-arn arn:aws:acm:us-east-1:123456789:certificate/abc-123

# Update an existing custom domain name to dualstack
aws apigateway update-domain-name \
  --domain-name api.example.com \
  --patch-operations "op='replace',path='/endpointConfiguration/ipAddressType',value='dualstack'"
```

## Terraform Example - HTTP API with Dualstack

```hcl
# main.tf - AWS HTTP API Gateway with IPv6 dualstack

resource "aws_apigatewayv2_api" "ipv6_api" {
  name          = "ipv6-http-api"
  protocol_type = "HTTP"

  # Enable both IPv4 and IPv6 endpoint types
  ip_address_type = "dualstack"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.ipv6_api.id
  name        = "$default"
  auto_deploy = true
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.ipv6_api.api_endpoint
}
```

## Verify IPv6 Resolution

```bash
# Resolve the API endpoint for AAAA records
dig AAAA abc123def.execute-api.us-east-1.amazonaws.com

# Test the API over IPv6
# For REST APIs, include the deployed stage in the path, for example /prod/health
curl -6 https://abc123def.execute-api.us-east-1.amazonaws.com/health

# Test custom domain over IPv6
curl -6 https://api.example.com/health
```

## Lambda Integration - Handle IPv6 Client IPs

When clients connect over IPv6, API Gateway passes the client address in the request context. HTTP APIs with payload format version 2.0 use `requestContext.http.sourceIp`, while REST APIs and payload format version 1.0 use `requestContext.identity.sourceIp`.

```python
def handler(event, context):
    request_context = event.get("requestContext", {})
    source_ip = (
        request_context.get("http", {}).get("sourceIp")
        or request_context.get("identity", {}).get("sourceIp")
    )
    # source_ip may be e.g. "2001:db8::1" for IPv6 clients
    print(f"Request from: {source_ip}")
    return {"statusCode": 200, "body": "OK"}
```

## Conclusion

AWS HTTP APIs and REST APIs both support dualstack IP address types. If you use a custom domain name, configure the domain name for dualstack as well. Monitor your API Gateway endpoints from both IPv4 and IPv6 perspectives using OneUptime to ensure parity.
