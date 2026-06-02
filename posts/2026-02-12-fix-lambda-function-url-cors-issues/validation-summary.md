# Validation Summary: How to Fix Lambda Function URL CORS Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda Function URLs
- AWS CLI
- CORS
- Python Lambda handlers
- Node.js Lambda handlers
- curl

## Sources Consulted
- AWS Lambda Developer Guide: Creating and managing Lambda function URLs: https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html
- AWS Lambda API Reference: Cors: https://docs.aws.amazon.com/lambda/latest/api/API_Cors.html
- AWS Lambda Developer Guide: Invoking Lambda function URLs: https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html
- AWS Lambda Developer Guide: Control access to Lambda function URLs: https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
- AWS CLI Command Reference: create-function-url-config: https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function-url-config.html
- MDN Web Docs: Cross-Origin Resource Sharing (CORS): https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Web Docs: Access-Control-Allow-Origin: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin

## Issues Found
- The post incorrectly stated that the fix requires both Function URL CORS configuration and CORS headers in the Lambda response. AWS documentation says Lambda automatically adds configured Function URL CORS headers to all responses, and returning the same headers from the function can create duplicate CORS headers on non-preflight requests. I changed the guidance to recommend Function URL CORS as the primary approach and manual response headers only as an alternative.
- The sequence diagram incorrectly attributed CORS headers on the actual response to the function. I updated it to show CORS headers coming from the Function URL configuration when that configuration is used.
- The manual-response examples were presented as required even when Function URL CORS is configured. I changed the surrounding text to make clear that these examples apply when handling CORS manually.
- The multiple-origin section advised updating Function URL CORS config in addition to dynamic manual response headers. I changed it to present Function URL CORS as an alternative to manual dynamic response headers, avoiding duplicate CORS headers.
- The quick reference public access policy only granted `lambda:InvokeFunctionUrl`. AWS documentation now says new function URLs require both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction` permissions. I added the second `add-permission` command with `--invoked-via-function-url`.
- The `AllowHeaders` mistake example omitted `AllowMethods`, which could leave an incomplete CORS configuration in a copy-pasted command. I added `AllowMethods` to the snippet.
- The Python examples used `event.get('body', '{}')`, which still returns `None` if Lambda includes `"body": null` for a request without a body. I changed them to `event.get('body') or '{}'` so requests without bodies do not fail JSON parsing.

## Review Notes
The Python and Node.js Lambda response examples are syntactically valid and match the Lambda Function URL response shape. They should be used only for manual CORS handling, not alongside equivalent Function URL CORS headers.
