# Validation Summary: How to Configure Azure Application Gateway with Rewrite Rules for HTTP Headers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Gateway v2
- Azure CLI
- HTTP request and response headers
- Application Gateway rewrite rule sets
- URL path rewrite rules
- HTTP security headers and CORS headers

## Sources Consulted
- Microsoft Learn: Rewrite HTTP headers and URL with Azure Application Gateway: https://learn.microsoft.com/en-us/azure/application-gateway/rewrite-http-headers-url
- Microsoft Learn: Azure CLI `az network application-gateway rewrite-rule`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rewrite-rule
- Microsoft Learn: Azure CLI `az network application-gateway rewrite-rule condition`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rewrite-rule/condition
- Microsoft Learn: Azure CLI `az network application-gateway rewrite-rule set`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rewrite-rule/set
- Microsoft Learn: Azure CLI `az network application-gateway rule`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rule
- Microsoft Learn: Troubleshoot rewrite rules in Azure Application Gateway: https://learn.microsoft.com/en-us/troubleshoot/azure/application-gateway/troubleshoot-url-rewrite-rules

## Issues Found
- The conditional rewrite examples used `--conditions` with positional values, which is not the documented Azure CLI command shape. I changed those examples to create the rewrite rule first and then add the condition with `az network application-gateway rewrite-rule condition create`, using documented parameters such as `--variable`, `--pattern`, `--ignore-case`, and `--negate`.
- The URL rewrite example changed `/api/v1/users` to `/api/v2users` because the rewritten path missed the slash between `/api/v2` and the captured value. I changed it to `/api/v2/{var_uri_path_1}`.
- The HTTP-to-HTTPS rewrite example implied that setting a `Location` response header alone performs a redirect. I changed the example to describe rewriting backend redirect `Location` headers instead.
- The troubleshooting note incorrectly said request headers are only available in request rewrite rules and response headers are only available in response rewrite rules. I changed it to focus on the correct variable prefixes and context-sensitive server variable availability.

## Review Notes
- The Azure CLI is not installed in the local review environment, so commands were verified against current Microsoft Learn CLI reference pages rather than local `az --help` output.
- Application Gateway rewrite rules are supported on the v2 SKUs, and the reviewed examples target that scope.
