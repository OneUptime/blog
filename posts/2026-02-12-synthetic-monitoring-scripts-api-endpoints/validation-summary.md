# Validation Summary: How to Create Synthetic Monitoring Scripts for API Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Synthetics
- CloudWatch Synthetics Node.js canaries
- CloudWatch Synthetics Python canaries
- AWS Secrets Manager
- AWS SDK for JavaScript v3
- OAuth2 client credentials flow
- HTTP API response validation

## Sources Consulted
- AWS CloudWatch Synthetics Node.js library functions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Library_function_Nodejs.html
- AWS CloudWatch Synthetics runtime versions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_Library.html
- AWS CloudWatch Synthetics Node.js runtime versions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_Nodejs.html
- AWS CloudWatch Synthetics Python Selenium runtime versions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_python_selenium.html
- AWS CloudWatch Synthetics Python library functions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_Library_Python.html
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS SDK for JavaScript v3 Secrets Manager examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_secrets-manager_code_examples.html
- AWS CloudWatch Synthetics canary creation documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_Create.html

## Issues Found
- The JavaScript examples treated the `executeHttpStep` callback argument as an object with `response.body`. AWS documents this callback argument as a Node.js `http.IncomingMessage`, so the response body must be read from the stream. Updated the examples that parse or log response bodies to use a `readResponseBody(response)` helper.
- The Secrets Manager examples used the AWS SDK for JavaScript v2 `aws-sdk` package. Current supported Lambda Node.js runtimes include the AWS SDK for JavaScript v3, and current CloudWatch Synthetics Node.js runtimes use Node.js 20/22. Updated the examples to use `@aws-sdk/client-secrets-manager` with `SecretsManagerClient` and `GetSecretValueCommand`.
- The OAuth2 form body interpolated credentials directly into an `application/x-www-form-urlencoded` request body. Updated it to use `URLSearchParams` so special characters in client IDs or secrets are encoded correctly.
- The Python example used the third-party `requests` package without noting that it must be packaged with the canary. Replaced it with Python standard-library `urllib` calls to keep the example self-contained for the runtime.
- The timeout best-practice note said the default timeout is 60 seconds. AWS documentation states that if a timeout is not specified, CloudWatch Synthetics chooses one based on the canary frequency, and configured timeouts should be at least 15 seconds. Updated the note accordingly.

## Review Notes
The code snippets were syntax checked after editing: all JavaScript fenced code blocks passed `node --check`, and the Python fenced code block passed `python3 -m py_compile`. Current CloudWatch Synthetics runtime documentation notes namespace migrations for newer runtimes; the legacy `Synthetics` and `SyntheticsLogger` imports are still shown in the AWS `executeHttpStep` library examples but should be revisited if this post is later updated for a specific latest runtime family.
