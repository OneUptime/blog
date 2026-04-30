# Validation Summary: How to Configure GCP Cloud Functions IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Run functions / Cloud Functions 2nd gen
- Cloud Run networking
- Direct VPC egress
- Serverless VPC Access
- Dual-stack VPC subnets
- IPv6
- Python Functions Framework
- `curl`
- `dig`

## Sources Consulted
- Google Cloud: Compare Cloud Run functions - https://cloud.google.com/run/docs/functions/comparison
- Google Cloud: Deploy a Cloud Run function - https://cloud.google.com/run/docs/deploy-functions
- Google Cloud: Write Cloud Run functions - https://cloud.google.com/run/docs/write-functions
- Google Cloud: VPC with connectors - https://cloud.google.com/run/docs/configuring/vpc-connectors
- Google Cloud: Set up dual-stack (IPv4 and IPv6) - https://cloud.google.com/run/docs/configuring/vpc-dual-stack-subnet
- Google Cloud: IPv6 support in Google Cloud - https://cloud.google.com/vpc/docs/ipv6-support
- Google Cloud: Request Headers in Cloud Functions - https://cloud.google.com/functions/docs/reference/headers
- Python documentation: `ipaddress` - https://docs.python.org/3/library/ipaddress.html
- Requests documentation - https://requests.readthedocs.io/en/stable/
- curl manual - https://curl.se/docs/manpage.html#--resolve

## Issues Found
- The post originally described IPv6 access through a VPC Connector. I corrected this to Direct VPC egress on a dual-stack subnet because Serverless VPC Access connectors on Cloud Run and Cloud Run functions route IPv4 only.
- The Python handler sample originally used an AWS Lambda-style `event, context` signature and an AWS proxy-style response object. I replaced it with a Cloud Run functions HTTP handler that accepts a Flask request object, reads `X-Forwarded-For`, and returns JSON.
- The post used invalid IPv6 literals such as `2001:db8::backend` and `2001:db8::db`. I replaced them with valid IPv6 literals.
- The `curl --resolve` example originally passed an IPv6 literal without brackets. I corrected it to `your-function-domain.example.com:443:[2001:db8::1]`, which matches curl's documented syntax.
- The testing section originally implied that the function's public hostname inherently supports IPv6. I changed it to test only a hostname that actually publishes an `AAAA` record.
- The introduction, description, and conclusion were updated to reflect the current Cloud Run functions product model and the actual IPv6 support boundaries documented by Google Cloud.

## Review Notes
- The corrected post now aligns with current Google Cloud terminology: Cloud Functions 2nd gen is now Cloud Run functions.
- The post is accurate for private IPv6 resource access from Cloud Run functions by way of Direct VPC egress and dual-stack subnets.
- Public IPv6 ingress still depends on the hostname or load balancer in front of the function publishing an `AAAA` record.
