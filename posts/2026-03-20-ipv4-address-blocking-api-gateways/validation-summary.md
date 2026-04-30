# Validation Summary: How to Implement IPv4 Address Blocking in API Gateways

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kong Gateway IP Restriction plugin
- AWS API Gateway resource policies
- Nginx `ngx_http_geo_module`
- Node.js
- Express
- Redis / node-redis
- Terraform
- AWS WAFv2

## Sources Consulted
- Kong IP Restriction plugin overview: https://developer.konghq.com/plugins/ip-restriction/
- Kong IP Restriction examples: https://developer.konghq.com/plugins/ip-restriction/examples/deny/ and https://developer.konghq.com/plugins/ip-restriction/examples/allow-and-deny/
- AWS API Gateway resource policy examples: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies-examples.html
- Nginx `ngx_http_geo_module` reference: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- Express behind proxies guide: https://expressjs.com/en/guide/behind-proxies.html
- Express 4.x API reference (`trust proxy`, `req.ip`): https://expressjs.com/en/4x/api.html
- Node.js ECMAScript modules documentation (`top-level await`): https://nodejs.org/api/esm.html
- Redis node-redis connection guide: https://redis.io/docs/latest/develop/clients/nodejs/connect/
- Redis node-redis error handling guide: https://redis.io/docs/latest/develop/clients/nodejs/error-handling/
- Terraform AWS provider docs source for `aws_wafv2_ip_set`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_ip_set.html.markdown
- Terraform AWS provider docs source for `aws_wafv2_web_acl`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl.html.markdown
- Terraform AWS provider docs source for `aws_wafv2_web_acl_association`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl_association.html.markdown
- AWS WAF IP set match statement reference: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-ipset-match.html

## Issues Found
- The Kong declarative snippet was labeled as `decK/KongIngress`, but the YAML structure shown is a decK / DB-less `kong.yaml` style config, not a `KongIngress` resource. I corrected the label and added `_format_version: "3.0"` to make the example match official declarative examples.
- The Node.js + Redis example used top-level `await` together with CommonJS `require()`, which is not valid CommonJS. I wrapped startup in an async `main()` function, added the recommended Redis error handler, enabled Express proxy-aware IP handling for a single upstream proxy, and added `app.listen(3000)` so the snippet is runnable.
- The Terraform section defined an IP set and an association, but it did not define the `aws_wafv2_web_acl` resource or the blocking rule that references the IP set. I added a minimal Web ACL with `default_action`, a `rule` using `ip_set_reference_statement`, and the required `visibility_config` blocks so the example actually works as described.
- The conclusion claimed “zero-overhead enforcement,” which is technically inaccurate because the gateway or WAF still evaluates the request. I reworded it to say the request is blocked earlier in the path so the application does not have to process it.

## Review Notes
- The API Gateway resource policy example is correct for public REST APIs using `aws:SourceIp`. For private REST APIs, AWS documents using `aws:VpcSourceIp` instead.
- The Terraform WAF association shown is for an API Gateway REST stage via `aws_api_gateway_stage`; the current `aws_wafv2_web_acl_association` resource does not support API Gateway v2 HTTP APIs.
- Kong, Nginx, AWS WAF forwarded-IP rules, and Express all depend on correct client IP forwarding/trust configuration when there are additional proxies or load balancers in front of the service.
