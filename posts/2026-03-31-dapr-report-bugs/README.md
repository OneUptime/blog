# How to Report Bugs in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Bug Report, Open Source, Debugging, Contribution

Description: Report Dapr bugs effectively by gathering diagnostic information, using the bug report template, providing a minimal reproduction case, and following up during triage.

---

## Before Filing a Bug Report

Check these first to avoid duplicate reports:

```bash
# Search existing open issues
gh issue list \
  --repo dapr/dapr \
  --state open \
  --search "your error message" \
  --limit 10

# Search closed issues (bug may be fixed in newer version)
gh issue list \
  --repo dapr/dapr \
  --state closed \
  --search "your error message" \
  --limit 10

# Check if a newer Dapr version fixes the issue
gh release list --repo dapr/dapr --limit 5
```

## Gather Diagnostic Information

Collect this information before writing the report:

```bash
# Dapr CLI version
dapr version

# Dapr runtime version (from sidecar logs)
kubectl logs -l app=myapp -c daprd | grep "dapr runtime version"

# Kubernetes version (if applicable)
kubectl version

# Operating system
uname -a  # Linux/macOS
# or
winver    # Windows

# Dapr logs from the sidecar
kubectl logs -l app=myapp -c daprd --since=10m > daprd.log

# Application logs
kubectl logs -l app=myapp -c app --since=10m > app.log
```

## Capture the Error

Get the full error with stack trace:

```bash
# Enable debug logging for more detail
dapr run \
  --app-id myapp \
  --log-level debug \
  -- node app.js 2>&1 | tee dapr-debug.log

# In Kubernetes, increase log verbosity
kubectl set env deployment/myapp \
  DAPR_LOG_LEVEL=debug \
  -c daprd
```

## Create a Minimal Reproduction

A minimal reproduction is the most valuable part of a bug report:

```bash
# Minimal Go app that triggers the bug
mkdir -p /tmp/dapr-bug-repro
cat > /tmp/dapr-bug-repro/main.go << 'EOF'
package main

import (
    "context"
    "fmt"
    "log"
    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil { log.Fatal(err) }
    defer client.Close()

    // Minimal code that triggers the bug
    _, err = client.GetState(context.Background(), "statestore", "testkey", nil)
    if err != nil {
        fmt.Printf("ERROR: %v\n", err) // This is the bug
    }
}
EOF

cat > /tmp/dapr-bug-repro/components/statestore.yaml << 'EOF'
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
EOF
```

## Bug Report Template

````markdown
## Bug Description
A clear and concise description of the bug.

## Dapr Version
- Dapr CLI: 1.14.0
- Dapr Runtime: 1.14.0
- SDK: @dapr/dapr 3.3.0 (if applicable)

## Environment
- OS: Ubuntu 22.04
- Kubernetes: 1.29 (if applicable)
- State Store / Pub-Sub: Redis 7.0

## Steps to Reproduce
1. Run `dapr init`
2. Start Redis with `docker run -d -p 6379:6379 redis`
3. Run the following code:
```go
// Minimal reproduction code here
```

## Expected Behavior
The state store returns the saved value.

## Actual Behavior
Returns error: `connection refused`

## Logs
```json
[paste relevant logs here]
```

## Additional Context
Any other context about the problem.
````

## Submit the Bug Report

```bash
gh issue create \
  --repo dapr/dapr \
  --title "bug: state store returns connection refused after Redis restart" \
  --label "bug" \
  --body "$(cat bug-report.md)"
```

## Follow Up During Triage

After filing, watch for triage labels:

- `needs-triage` - awaiting maintainer review
- `confirmed` - bug reproduced by maintainer
- `help-wanted` - community can fix this
- `wontfix` - not a bug or out of scope

```bash
# Check the status and updates on your issue
gh issue view 1234 --repo dapr/dapr --comments
```

## Summary

Effective Dapr bug reports include the exact Dapr and runtime versions, a minimal reproduction script, full error logs with debug logging enabled, and environment details. A well-crafted bug report with a minimal reproduction dramatically reduces triage time and increases the chance your bug is fixed quickly.
