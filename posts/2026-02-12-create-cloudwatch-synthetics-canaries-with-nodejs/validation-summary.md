# Validation Summary: How to Create CloudWatch Synthetics Canaries with Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudWatch Synthetics
- AWS CLI
- AWS IAM
- AWS S3
- AWS CloudWatch Alarms
- AWS Lambda
- AWS Secrets Manager
- Node.js
- Puppeteer

## Sources Consulted
- CloudWatch Synthetics overview: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html
- Synthetics runtime versions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_Library.html
- Node.js and Puppeteer runtime versions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_nodejs_puppeteer.html
- Writing a Node.js canary script using the Puppeteer runtime: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_WritingCanary_Nodejs_Pup.html
- Node.js Synthetics library functions, including `executeHttpStep`: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Library_function_Nodejs.html
- AWS CLI `synthetics create-canary` reference: https://docs.aws.amazon.com/cli/latest/reference/synthetics/create-canary.html
- AWS CLI `synthetics update-canary` reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/synthetics/update-canary.html
- Required roles and permissions for canaries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_CanaryPermissions.html
- CloudWatch Logs permissions reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/permissions-reference-cwl.html

## Issues Found
- The post said Node.js was one of two supported runtimes, with Python as the other. Current CloudWatch Synthetics documentation lists Node.js, Python, and Java languages, with Puppeteer, Playwright, and Selenium frameworks. Updated the wording to say Node.js is one of the supported languages.
- The examples used the legacy `Synthetics` and `SyntheticsLogger` module names while the deployment command now uses the current `syn-nodejs-puppeteer-15.1` runtime. AWS documents that `syn-nodejs-puppeteer-13.1` and later use the new namespaces. Updated examples to `@aws/synthetics-puppeteer` and `@aws/synthetics-logger`.
- The deployment command created an S3 bucket and referenced `canary-code.zip` in `create-canary`, but did not upload the zip file to S3. Added `aws s3 cp canary-code.zip s3://my-canary-artifacts-123456/canary-code.zip`.
- The deployment command used `syn-nodejs-puppeteer-6.1`, which is older than the current recommended runtime. Updated it to `syn-nodejs-puppeteer-15.1`.
- The IAM example scoped `s3:GetBucketLocation` to the object ARN. AWS documents this permission separately on the bucket ARN. Split the S3 permissions so object actions use `arn:aws:s3:::my-canary-artifacts-123456/*` and `s3:GetBucketLocation` uses `arn:aws:s3:::my-canary-artifacts-123456`.
- The API examples treated the `executeHttpStep` callback as `(response, body)`. AWS documents the callback as receiving the HTTP response object, with examples reading the body from the response stream. Updated the examples to read the response body with a helper before parsing JSON.
- Removed an unused `https` import from the API canary after verifying `executeHttpStep` handles HTTP/HTTPS internally.
- The browser example clicked the login button and then waited for navigation, which can miss fast navigations in Puppeteer. Updated it to wait and click with `Promise.all`.
- The best-practices section stated the default timeout is 60 seconds. AWS documents that CloudWatch chooses a timeout based on frequency when no timeout is specified. Updated the wording.

## Review Notes
JavaScript code blocks and JSON snippets were syntax-checked locally. The AWS CLI was not installed in the workspace, so CLI options and shapes were verified against the official AWS CLI reference instead of local `aws --help` output.
