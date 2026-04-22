# How to Save Debug Logs to a File with TF_LOG_PATH in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Debugging, TF_LOG_PATH, Logging, Troubleshooting, Infrastructure as Code

Description: Learn how to use TF_LOG_PATH to redirect OpenTofu debug logs to a file for offline analysis, sharing with support, and long-running apply sessions.

## Introduction

By default, `TF_LOG` writes debug output to stderr, mixing it with normal OpenTofu output in the terminal. `TF_LOG_PATH` redirects all log messages to a file, keeping the terminal clean and preserving logs for later analysis - essential for long apply sessions or CI/CD debugging.

## Basic Usage

```bash
# Write DEBUG logs to a file

export TF_LOG=DEBUG
export TF_LOG_PATH=/tmp/opentofu-debug.log
tofu plan

# Terminal output remains clean
# All debug output goes to /tmp/opentofu-debug.log
```

## Timestamped Log Files

For multiple runs in the same session, append timestamps to keep each run in its own file:

```bash
#!/bin/bash
# run-tofu.sh - always save logs with timestamps

LOG_DIR="./logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
COMMAND="${1:-plan}"

export TF_LOG=DEBUG
export TF_LOG_PATH="${LOG_DIR}/tofu-${COMMAND}-${TIMESTAMP}.log"

echo "Saving debug logs to: $TF_LOG_PATH"
tofu "$COMMAND" "${@:2}"

echo "Log saved to: $TF_LOG_PATH"
```

## Separate Core and Provider Log Files

```bash
# Direct core and provider logs to one file with separate levels
export TF_LOG_CORE=DEBUG
export TF_LOG_PROVIDER=TRACE
export TF_LOG_PATH=/tmp/opentofu-all.log

tofu plan

# Or capture separate files by running the command with different filters:
TF_LOG_CORE=DEBUG TF_LOG_PROVIDER=OFF TF_LOG_PATH=/tmp/core.log tofu plan
TF_LOG_CORE=OFF TF_LOG_PROVIDER=TRACE TF_LOG_PATH=/tmp/providers.log tofu plan
```

## Analyzing Log Files

```bash
# Count errors in the log
grep -c "\[ERROR\]" /tmp/opentofu-debug.log

# Show only error lines with context
grep -A 5 "\[ERROR\]" /tmp/opentofu-debug.log

# Find all API requests in provider logs
grep "Request:" /tmp/opentofu-debug.log | wc -l

# Show timeline of operations
grep -E "^[0-9]{4}-[0-9]{2}-[0-9]{2}" /tmp/opentofu-debug.log | \
  awk '{print $1, $2, $4}' | head -50
```

## Rotating Logs in Long Pipelines

```bash
# Rotate log files daily using logrotate
cat > /etc/logrotate.d/opentofu <<EOF
/var/log/opentofu/*.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
    create 640 ci ci
}
EOF
```

## CI/CD: Uploading Logs as Artifacts

```yaml
# .github/workflows/infra.yml
- name: OpenTofu Plan
  env:
    TF_LOG: DEBUG
    TF_LOG_PATH: /tmp/opentofu-plan.log
  run: tofu plan -out=tfplan.binary

- name: Upload debug logs
  if: failure()   # Only upload on failure
  uses: actions/upload-artifact@v4
  with:
    name: opentofu-debug-logs-${{ github.run_id }}
    path: /tmp/opentofu-plan.log
    retention-days: 30
```

## Security: Protecting Log Files

Log files may contain sensitive values (API keys, resource IDs). Handle them carefully:

```bash
# Restrict file permissions before writing
umask 077
export TF_LOG=DEBUG
export TF_LOG_PATH=/tmp/private-debug.log
tofu apply

# Encrypt before sharing
gpg --symmetric --cipher-algo AES256 /tmp/private-debug.log

# On suitable filesystems, delete securely when done
shred -u /tmp/private-debug.log
```

## Conclusion

`TF_LOG_PATH` is essential for any serious OpenTofu debugging session. Redirect logs to timestamped files, upload them as CI/CD artifacts on failure, and always treat them as sensitive. Combined with `TF_LOG_CORE` and `TF_LOG_PROVIDER`, you can surgically capture exactly the information needed to diagnose problems without overwhelming the terminal.
