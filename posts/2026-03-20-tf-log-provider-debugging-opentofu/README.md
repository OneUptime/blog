# How to Use TF_LOG_PROVIDER for Provider Debugging in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Debugging, TF_LOG_PROVIDER, Provider, Troubleshooting, Infrastructure as Code

Description: Learn how to use TF_LOG_PROVIDER to capture verbose debug logging only for providers, exposing raw API calls and responses to diagnose provider-level failures.

## Introduction

Provider errors - authentication failures, rate limits, unexpected API responses - are best debugged by looking at provider logs for what the provider is doing when it calls the cloud API. `TF_LOG_PROVIDER` enables verbose logging for providers without enabling core engine logs.

## Enabling Provider-Level Logging

```bash
# Debug all providers

export TF_LOG_PROVIDER=DEBUG
tofu plan

# TRACE level - most verbose provider logging; HTTP detail depends on the provider
export TF_LOG_PROVIDER=TRACE
tofu apply

# Disable core logging while debugging providers
unset TF_LOG
export TF_LOG_CORE=OFF
export TF_LOG_PROVIDER=TRACE
tofu plan
```

## What Provider TRACE Logs Show

Provider TRACE logs can expose provider framework details and, when the provider emits HTTP transaction logs, API request and response details:

```text
2026-03-20T10:05:00.000Z [TRACE] provider.terraform-provider-aws: starting provider
2026-03-20T10:05:00.100Z [DEBUG] provider.terraform-provider-aws: AWS SDK Go v2 Request
  Method: POST
  URL: https://ec2.us-east-1.amazonaws.com/
  Body: Action=DescribeVpcs&Filter.1.Name=tag:Name&Filter.1.Value.1=prod-vpc

2026-03-20T10:05:00.350Z [TRACE] provider.terraform-provider-aws: AWS SDK Go v2 Response
  Status: 200 OK
  Body: <DescribeVpcsResponse>
          <vpcSet>
            <item><vpcId>vpc-0abc123def</vpcId>...</item>
          </vpcSet>
        </DescribeVpcsResponse>
```

## Diagnosing Authentication Errors

```bash
# Capture provider logs to a file
export TF_LOG_PROVIDER=DEBUG
export TF_LOG_PATH=/tmp/provider-debug.log
tofu plan 2>/dev/null

# Look for authentication-related messages
grep -iE "auth|credential|token|signature|403|401|unauthorized" /tmp/provider-debug.log
```

## Diagnosing Rate Limiting

```bash
export TF_LOG_PROVIDER=DEBUG
export TF_LOG_PATH=/tmp/rate-limit.log
tofu apply

# Find 429 responses and retry logic
grep -E "429|ThrottlingException|RateLimitExceeded|retry|backoff" /tmp/rate-limit.log
```

## Diagnosing Unexpected Plan Diffs

If OpenTofu plans changes you do not expect, provider logs can help show refresh and read activity to compare what the provider read from the API with what is in state:

```bash
export TF_LOG_PROVIDER=TRACE
export TF_LOG_PATH=/tmp/plan-debug.log
tofu plan

# Find Read calls (what the provider read from the API)
grep -E "ReadResource|RefreshState|Refresh:" /tmp/plan-debug.log
```

## Filtering Logs for a Specific Provider

When multiple providers are active, filter log output to a specific provider:

```bash
# Only show AWS provider log lines
TF_LOG_PROVIDER=TRACE TF_LOG_CORE=OFF tofu plan 2>&1 | \
  grep "provider.terraform-provider-aws"

# Only show Google provider log lines
TF_LOG_PROVIDER=TRACE tofu plan 2>&1 | \
  grep "provider.terraform-provider-google"
```

## Redacting Sensitive Data in Provider Logs

Provider logs may contain sensitive values (API keys, passwords). Always treat log files as sensitive:

```bash
# Restrict permissions on the log file
touch /tmp/provider-debug.log
chmod 600 /tmp/provider-debug.log
TF_LOG_PROVIDER=TRACE TF_LOG_PATH=/tmp/provider-debug.log tofu plan

# Remove the file when done; use a platform-specific secure deletion process if required
shred -u /tmp/provider-debug.log
```

## Conclusion

`TF_LOG_PROVIDER` gives you focused visibility into what your providers are doing: API calls, responses, retries, and provider framework activity when those details are logged by the provider. Start with `DEBUG` for general provider issues and escalate to `TRACE` when you need the most detailed provider logs. Always treat provider logs as sensitive artifacts due to potential credential exposure.
