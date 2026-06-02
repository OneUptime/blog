# Validation Summary: How to Monitor API Endpoints with CloudWatch Synthetics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon CloudWatch Synthetics
- AWS CLI
- CloudWatch metrics, dashboards, metric alarms, and composite alarms
- Node.js canary scripts
- TLS certificate checks

## Sources Consulted
- AWS CloudWatch Synthetics Node.js library functions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Library_function_Nodejs.html
- AWS CloudWatch Synthetics Node.js and Puppeteer runtime versions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_nodejs_puppeteer.html
- AWS CloudWatch Synthetics runtime support policy: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Runtime_Support_Policy.html
- AWS CLI `synthetics create-canary` command reference: https://docs.aws.amazon.com/cli/latest/reference/synthetics/create-canary.html
- CloudWatch metrics published by canaries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_metrics.html
- AWS CLI `cloudwatch put-metric-alarm` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI `cloudwatch put-composite-alarm` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-composite-alarm.html
- CloudWatch dashboard body structure: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Amazon CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/

## Issues Found
- The API canary used deprecated legacy module names and a deprecated `syn-nodejs-puppeteer-6.1` runtime. Updated the examples to use the current `syn-nodejs-puppeteer-15.1` runtime and the current `@aws/synthetics-puppeteer` / `@aws/synthetics-logger` namespaces documented for newer runtimes.
- The API canary passed the request body as the fourth argument to `synthetics.executeHttpStep`, but AWS documents the fourth argument as step configuration. Moved the POST body into `requestOptions.body`.
- The API canary callback expected `responseBody` as a second callback argument, but AWS documents the callback as receiving a Node.js `http.IncomingMessage`. Added a `readResponseBody(response)` helper and read the body from the stream before validating JSON.
- The latency threshold was configured but not used. Added a duration check inside each HTTP step so the sample actually enforces `LATENCY_THRESHOLD_MS`.
- The SSL canary imported the deprecated logger namespace and an unused Synthetics module. Updated the logger import and removed the unused import.
- The alerting section created one alarm named `api-monitor-any-failure` but the composite alarm referenced three regional alarm names that did not exist. Replaced the single command with regional failure alarms matching the composite alarm rule.
- The latency alarm used `--statistic p90`, but percentile statistics are configured with `--extended-statistic p90` in the CloudWatch CLI. Updated the command.
- The cost section described costs as Lambda, S3, and metrics only, and the table understated Synthetics costs. Updated it to include Synthetics canary run charges, CloudWatch Logs, Lambda, S3, and custom metrics, with canary-run estimates based on the documented per-run pricing.

## Review Notes
The JavaScript fenced code blocks were syntax checked with `node --check`. The AWS CLI is not installed in the local environment, so CLI validation was performed against official AWS CLI documentation rather than local `aws --help` output.
