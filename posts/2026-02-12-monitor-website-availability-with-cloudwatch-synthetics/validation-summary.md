# Validation Summary: How to Monitor Website Availability with CloudWatch Synthetics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Synthetics
- Amazon CloudWatch metrics and alarms
- AWS CLI
- Node.js
- Puppeteer-based Synthetics canaries
- Amazon S3 canary artifacts

## Sources Consulted
- AWS CLI Command Reference: `synthetics create-canary` - https://docs.aws.amazon.com/cli/latest/reference/synthetics/create-canary.html
- AWS CLI Command Reference: `synthetics get-canary-runs` - https://docs.aws.amazon.com/cli/latest/reference/synthetics/get-canary-runs.html
- AWS CLI Command Reference: `cloudwatch put-metric-alarm` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon CloudWatch User Guide: Runtime versions using Node.js and Puppeteer - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_nodejs_puppeteer.html
- Amazon CloudWatch User Guide: Library functions available for Node.js canary scripts using Puppeteer - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_Library_Nodejs.html
- Amazon CloudWatch User Guide: Writing a Node.js canary script using the Puppeteer runtime - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_WritingCanary_Nodejs_Pup.html
- Amazon CloudWatch User Guide: Synthetic monitoring canaries - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html
- Amazon CloudWatch User Guide: Alarm evaluation - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-evaluation.html

## Issues Found
- Updated Synthetics imports from legacy `Synthetics` and `SyntheticsLogger` module names to `@aws/synthetics-puppeteer` and `@aws/synthetics-logger`, matching current AWS guidance for recent Puppeteer runtimes.
- Updated `syn-nodejs-puppeteer-6.1` examples to `syn-nodejs-puppeteer-15.1`, the current Node.js/Puppeteer runtime listed by AWS at review time.
- Fixed the page-load canary's JavaScript error collection. The original listener was registered after navigation, so it would miss page errors during the load it claimed to check.
- Added a null response guard after `page.goto`, consistent with AWS sample guidance that navigation can fail without returning a response.
- Corrected the CloudWatch alarm comment. The command used `--period 3600` and `--evaluation-periods 1`, which evaluates one hourly datapoint, not a monthly 99.9% SLO window.
- Reworded visual regression references because the post does not configure CloudWatch Synthetics visual monitoring or screenshot baseline comparison.

## Review Notes
The AWS CLI was not installed in the local workspace, so CLI validation was performed against the official AWS CLI command reference. JavaScript examples were syntax-checked locally with Node.js.
