# Validation Summary: How to Configure AWS Lambda IPv6 Support

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Lambda
- AWS Lambda function URLs
- Amazon VPC dual-stack subnets
- AWS CLI
- Python `ipaddress`
- Python `urllib.request`
- Python `requests`
- `curl`
- `dig`
- IPv6 URI syntax

## Sources Consulted
- AWS Lambda Developer Guide: Giving Lambda functions access to resources in an Amazon VPC: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda Developer Guide: Enable internet access for VPC-connected Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html
- AWS Lambda Developer Guide: Invoking Lambda function URLs: https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html
- AWS CLI Command Reference: `update-function-configuration`: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS Lambda Developer Guide: Working with layers for Python Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/python-layers.html
- Python standard library documentation: `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- Python standard library documentation: `urllib.request`: https://docs.python.org/3/library/urllib.request.html
- Python standard library documentation: `urllib.parse`: https://docs.python.org/3/library/urllib.parse.html
- RFC 3986, URI Generic Syntax: https://datatracker.ietf.org/doc/html/rfc3986
- curl documentation: https://curl.se/docs/manpage.html
- Local command help in the review environment: `curl --help all`, `dig -h`

## Issues Found
- The introduction, setup step, and conclusion described Lambda IPv6 support too generically. I corrected them to match AWS behavior: Lambda function URLs are dual stack for inbound traffic, while outbound IPv6 requires a VPC-attached function on dual-stack subnets with `Ipv6AllowedForDualStack=true`.
- The client IP extraction example used `requestContext.identity.sourceIp` as the primary field. For Lambda function URLs and API Gateway payload format 2.0 events, the source IP is exposed at `requestContext.http.sourceIp`, so I updated the code and kept older-field/header fallbacks.
- The IPv6 testing example used incorrect `curl --resolve` syntax for an IPv6 address. I fixed it to use brackets around the IPv6 literal and updated the hostname examples to the documented Lambda function URL format.
- The environment variable example used an invalid IPv6 literal (`2001:db8::backend`) and mixed Python code inside a Bash code fence. I replaced the invalid literal with a valid documentation address and split the Bash and Python snippets so each example is syntactically correct.
- The `requests` example implied the package was available by default in Lambda. I added a note that `requests` must be packaged with the function or provided through a Lambda layer.

## Review Notes
- The post uses `2001:db8::/32` addresses for examples. That prefix is reserved for documentation and is appropriate for sample code, but it is not routable on the public internet.
- Lambda function URLs are not available in every AWS region. The article is technically correct as revised, but region support should be checked against the current AWS documentation before deployment.
