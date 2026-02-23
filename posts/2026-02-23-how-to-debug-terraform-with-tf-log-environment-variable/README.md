# How to Debug Terraform with TF_LOG Environment Variable

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Debugging, TF_LOG, Troubleshooting, DevOps

Description: Learn how to use the TF_LOG environment variable and other debugging techniques to troubleshoot Terraform issues, including provider errors, state problems, and plan/apply failures.

---

When Terraform operations fail, the default error messages often lack the detail needed to diagnose the problem. The TF_LOG environment variable unlocks detailed logging that reveals exactly what Terraform is doing internally - API calls, state operations, provider communications, and dependency resolution. Understanding how to use TF_LOG effectively is an essential skill for anyone working with Terraform.

In this guide, we will cover how to use TF_LOG and other debugging techniques to troubleshoot Terraform issues.

## Understanding TF_LOG Levels

TF_LOG supports five logging levels, from least to most verbose:

```bash
# ERROR - Only errors
export TF_LOG=ERROR

# WARN - Errors and warnings
export TF_LOG=WARN

# INFO - General operational information
export TF_LOG=INFO

# DEBUG - Detailed debugging information
export TF_LOG=DEBUG

# TRACE - Maximum verbosity, includes all API calls
export TF_LOG=TRACE
```

## Basic Usage

The simplest way to enable logging is to set the environment variable before running Terraform:

```bash
# Enable debug logging for a plan operation
TF_LOG=DEBUG terraform plan

# Enable trace logging for an apply operation
TF_LOG=TRACE terraform apply

# Save logs to a file for analysis
TF_LOG=DEBUG TF_LOG_PATH=./terraform-debug.log terraform plan

# On Windows PowerShell
$env:TF_LOG = "DEBUG"
$env:TF_LOG_PATH = "terraform-debug.log"
terraform plan
```

## Targeted Logging

You can enable logging for specific Terraform components:

```bash
# Log only the core Terraform operations
export TF_LOG_CORE=DEBUG
terraform plan

# Log only provider operations
export TF_LOG_PROVIDER=TRACE
terraform plan

# Combine: debug core, trace provider
export TF_LOG_CORE=DEBUG
export TF_LOG_PROVIDER=TRACE
terraform plan

# Log to separate files
export TF_LOG_CORE=DEBUG
export TF_LOG_PATH=core.log
export TF_LOG_PROVIDER=TRACE
# Note: TF_LOG_PATH captures both if set
```

## Common Debugging Scenarios

### Debugging Authentication Issues

```bash
# When you get "Error: error configuring provider"
# Enable provider-level tracing to see auth details

TF_LOG_PROVIDER=TRACE terraform plan 2>&1 | grep -i "auth\|credential\|token\|403\|401"

# Example output might show:
# [TRACE] provider.aws: HTTP Request: GET https://sts.amazonaws.com
# [TRACE] provider.aws: HTTP Response: 403 Forbidden
# This tells you the credentials are invalid or expired
```

### Debugging State Issues

```bash
# When state operations fail
TF_LOG=DEBUG terraform state list 2>&1 | grep -i "state\|lock\|backend"

# When state refresh is slow or failing
TF_LOG=DEBUG terraform refresh 2>&1 | tee refresh.log

# Check for lock issues
TF_LOG=DEBUG terraform plan 2>&1 | grep -i "lock\|acquire\|release"
```

### Debugging Plan Discrepancies

```bash
# When plan shows unexpected changes
# Enable detailed logging to see what Terraform reads from the API
TF_LOG=TRACE terraform plan 2>&1 | tee plan-trace.log

# Search for specific resource in the log
grep "aws_instance.web" plan-trace.log

# Look for refresh data vs configuration differences
grep -A5 "Refreshing state" plan-trace.log
```

### Debugging Provider API Calls

```bash
# See every API call the provider makes
TF_LOG_PROVIDER=TRACE terraform apply 2>&1 | grep "HTTP"

# Example output:
# [TRACE] provider.aws: HTTP Request: POST https://ec2.us-east-1.amazonaws.com
# [TRACE] provider.aws: HTTP Request Body: Action=DescribeInstances&...
# [TRACE] provider.aws: HTTP Response: 200 OK
# [TRACE] provider.aws: HTTP Response Body: <?xml version="1.0"...

# Filter for errors only
TF_LOG_PROVIDER=TRACE terraform apply 2>&1 | grep -E "HTTP Response: [4-5][0-9]{2}"
```

## Saving and Analyzing Logs

```bash
# Save debug log to a file while still seeing normal output
TF_LOG=DEBUG TF_LOG_PATH=debug.log terraform plan

# The file gets all debug output
# The terminal gets normal terraform output

# Analyze the log file
# Find all errors
grep "ERROR\|error\|Error" debug.log

# Find all API calls and their response codes
grep "HTTP Response:" debug.log

# Find timing information
grep "elapsed" debug.log

# Find state operations
grep -i "state" debug.log | head -20
```

## Debugging Specific Issues

### Timeout Issues

```bash
# When operations time out, trace shows where the delay is
TF_LOG=TRACE terraform apply 2>&1 | grep -E "timeout|retry|wait"

# Increase timeouts in provider configuration
# provider "aws" {
#   retry_mode  = "adaptive"
#   max_retries = 25
# }
```

### Rate Limiting

```bash
# When you hit API rate limits
TF_LOG_PROVIDER=DEBUG terraform apply 2>&1 | grep -i "throttl\|rate\|429\|limit"

# Reduce parallelism to lower API call rate
TF_LOG_PROVIDER=DEBUG terraform apply -parallelism=5
```

### Dependency Issues

```bash
# When resources are created in unexpected order
TF_LOG_CORE=TRACE terraform plan 2>&1 | grep -i "depend\|graph\|walk"

# Visualize the dependency graph
terraform graph | dot -Tsvg > graph.svg
```

## Advanced Debugging Techniques

### Using Crash Logs

When Terraform crashes, it creates a crash log:

```bash
# Crash logs are saved to the current directory
# Look for files named crash.log or crash-*.log
ls -la crash*.log

# The crash log contains:
# - Terraform version
# - Go runtime information
# - Stack trace
# - The operation that was running when the crash occurred
```

### Debugging with terraform console

```bash
# Use terraform console to test expressions
terraform console

# Test variable interpolation
> var.environment
"production"

# Test functions
> cidrsubnet("10.0.0.0/16", 8, 1)
"10.0.1.0/24"

# Test conditional logic
> var.environment == "production" ? 3 : 1
3
```

### Debugging State Directly

```bash
# Pull state and examine it
terraform state pull > state.json

# Use jq to examine specific resources
python3 -c "
import json
with open('state.json') as f:
    state = json.load(f)
for r in state.get('resources', []):
    print(f\"{r['type']}.{r['name']}: {len(r.get('instances', []))} instances\")
"

# Check for resources that might be causing issues
terraform state show aws_instance.problematic_resource
```

## Creating Reproducible Bug Reports

When filing issues, include the right debug information:

```bash
# Collect all relevant information
echo "=== Terraform Version ===" > bug-report.txt
terraform version >> bug-report.txt

echo "=== Provider Versions ===" >> bug-report.txt
terraform providers >> bug-report.txt

echo "=== Environment ===" >> bug-report.txt
uname -a >> bug-report.txt

# Run with debug logging
echo "=== Debug Log ===" >> bug-report.txt
TF_LOG=DEBUG terraform plan 2>> bug-report.txt

# IMPORTANT: Redact sensitive information before sharing
# Remove access keys, secrets, tokens, and internal URLs
```

## Best Practices for Debugging

Start with INFO level and increase verbosity only if needed. TRACE produces enormous amounts of output that can be overwhelming. Start with INFO, then DEBUG, and only use TRACE for specific provider-level issues.

Always log to a file. Terminal output scrolls away quickly and debug logs can be thousands of lines long. Use TF_LOG_PATH to capture everything.

Use targeted logging. If you know the issue is with a provider, use TF_LOG_PROVIDER instead of TF_LOG to reduce noise.

Clean up after debugging. Remember to unset TF_LOG and TF_LOG_PATH when you are done debugging. Leaving debug logging enabled in CI/CD pipelines wastes resources and can expose sensitive information.

Search logs strategically. Use grep to find specific errors, API calls, or resource names rather than reading the entire log file.

Redact sensitive data. Debug logs contain API responses that may include sensitive information. Always redact before sharing logs with others or filing bug reports.

## Conclusion

The TF_LOG environment variable is the most powerful debugging tool in the Terraform toolkit. By understanding the different logging levels, knowing how to target specific components, and developing systematic debugging strategies, you can quickly diagnose and resolve even the most complex Terraform issues. Whether you are troubleshooting authentication failures, state corruption, provider bugs, or unexpected plan changes, detailed logging provides the visibility you need to find the root cause and fix it.
