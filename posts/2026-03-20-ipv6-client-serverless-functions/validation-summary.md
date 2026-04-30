# Validation Summary: How to Handle IPv6 Client Addresses in Serverless Functions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python
- IPv6
- AWS Lambda and Amazon API Gateway
- Azure Functions
- Google Cloud Functions / Cloud Run functions
- HTTP proxy headers (`Forwarded`, `X-Forwarded-For`, `CF-Connecting-IP`, `True-Client-IP`, `Fastly-Client-IP`)
- Python `ipaddress`

## Sources Consulted
- AWS Lambda function URL request payloads: https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html
- Amazon API Gateway HTTP API Lambda proxy payload format: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- Amazon API Gateway REST API Lambda proxy integration: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- Azure Functions Python developer reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python
- Azure App Service access restrictions (`X-Forwarded-For` header semantics): https://learn.microsoft.com/en-us/azure/app-service/overview-access-restrictions
- Azure Application Gateway request header behavior (`X-Forwarded-For` as `IP:port`): https://learn.microsoft.com/en-us/azure/application-gateway/how-application-gateway-works
- Google Cloud Functions request headers: https://cloud.google.com/functions/docs/reference/headers
- Google Cloud Load Balancing `X-Forwarded-For` behavior: https://cloud.google.com/load-balancing/docs/https
- Python `ipaddress` library reference: https://docs.python.org/3/library/ipaddress.html
- RFC 7239 `Forwarded` header: https://www.rfc-editor.org/rfc/rfc7239
- Cloudflare HTTP headers reference: https://developers.cloudflare.com/fundamentals/reference/http-headers/
- Fastly `Fastly-Client-IP` reference: https://www.fastly.com/documentation/reference/http/http-headers/Fastly-Client-IP/
- NGINX proxy module example for `X-Real-IP`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Netlify Serverless Functions API reference: https://docs.netlify.com/build/functions/api/
- Vercel `@vercel/functions` API reference: https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package

## Issues Found
- The Lambda example incorrectly relied only on request headers. AWS documents platform source IP fields in `requestContext.http.sourceIp` for payload format 2.0 and `requestContext.identity.sourceIp` for payload format 1.0, so the handler was updated to prefer those values before falling back to headers.
- The universal extractor overclaimed portability and did not correctly handle proxy formats such as RFC 7239 `Forwarded`, `IPv4:port`, or `[IPv6]:port`. The helper was updated to parse those forms and the wording was narrowed to trusted platform fields or trusted proxy headers.
- The original `X-Forwarded-For` logic treated the first header value as authoritative without qualification. Google Cloud and Cloudflare both document append behavior for forwarded headers, so the post now explicitly states that forwarding headers must come from trusted infrastructure that strips or overwrites client-supplied values.
- The rate-limiting example did not normalize IPv4-mapped IPv6 before deriving the key and used manual string slicing for `/64`. It now normalizes first and uses `ipaddress.ip_network(..., strict=False)` to derive a consistent `/64` prefix.
- The IPv6 anonymization example had unused imports and did not account for IPv4-mapped IPv6 inputs. It now reuses normalized address parsing and masks IPv6 addresses by network prefix.

## Review Notes
- The `/64` grouping remains a heuristic, not a platform rule. The post now frames it that way, which is more accurate for mixed enterprise and residential IPv6 environments.
- Azure Functions does not expose a dedicated client IP field in the Python `HttpRequest` reference used here, so the example appropriately relies on forwarded headers.
- The updated code snippets were sanity-checked locally with `python3` for parsing, normalization, `/64` key generation, and anonymization behavior.
