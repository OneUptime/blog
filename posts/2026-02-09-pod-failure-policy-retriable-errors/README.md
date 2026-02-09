# How to Use Pod Failure Policy to Distinguish Retriable vs Non-Retriable Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Error Handling

Description: Master Pod Failure Policies in Kubernetes Jobs to intelligently handle different types of errors, distinguishing between transient failures and permanent issues.

---

Not all failures are created equal. A network timeout deserves a retry, but a configuration error won't fix itself. Pod Failure Policies let you define sophisticated rules for handling different failure scenarios in Kubernetes Jobs, making your batch processing more reliable and efficient.

Without failure policies, Kubernetes treats all pod failures the same way, counting them against the backoff limit. This wastes retries on permanent errors and can exhaust your retry budget before transient issues resolve. Failure policies let you be smarter about which failures to retry and which to fail fast.

## Understanding Pod Failure Policies

Pod Failure Policies require Kubernetes 1.25 or later with the JobPodFailurePolicy feature gate enabled. They let you define rules based on container exit codes and pod conditions, then specify different actions for each rule.

Available actions include Count (increment backoff counter), FailJob (fail immediately), and Ignore (don't count against backoff limit). You can also specify FailIndex for indexed jobs to fail only a specific completion index.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smart-failure-handling
spec:
  backoffLimit: 5
  podFailurePolicy:
    rules:
    # Configuration errors should fail immediately
    - action: FailJob
      onExitCodes:
        operator: In
        values: [2]
    # Network errors should be retried
    - action: Count
      onExitCodes:
        operator: In
        values: [1]
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: processor:latest
```

This policy fails the entire job immediately on exit code 2 (config error) but counts exit code 1 (network error) against the backoff limit for retry.

## Defining Exit Code Conventions

Establish clear exit code conventions in your applications:

```python
#!/usr/bin/env python3
import sys
import os

# Exit code definitions
EXIT_SUCCESS = 0
EXIT_TRANSIENT_ERROR = 1      # Network, temporary resource issues
EXIT_CONFIG_ERROR = 2          # Invalid configuration
EXIT_INVALID_INPUT = 3         # Bad input data
EXIT_MISSING_DEPENDENCY = 4    # Required service unavailable
EXIT_RATE_LIMIT = 42           # API rate limit (should be ignored)

class ConfigError(Exception):
    """Non-retriable configuration error"""
    pass

class TransientError(Exception):
    """Retriable transient error"""
    pass

class InvalidInputError(Exception):
    """Non-retriable input error"""
    pass

def validate_config():
    """Validate required configuration"""
    if not os.getenv('API_KEY'):
        raise ConfigError("API_KEY environment variable not set")

    if not os.getenv('OUTPUT_BUCKET'):
        raise ConfigError("OUTPUT_BUCKET not configured")

def process_data(input_file):
    """Process data with clear error handling"""
    try:
        # Validate input
        if not os.path.exists(input_file):
            raise InvalidInputError(f"Input file not found: {input_file}")

        # Process the data
        with open(input_file) as f:
            data = f.read()

        # Simulate API call that might fail
        result = call_external_api(data)

        return result

    except ConnectionError as e:
        # Network error - retriable
        print(f"Network error (retriable): {e}")
        raise TransientError(str(e))

    except RateLimitExceeded as e:
        # Rate limit - should be ignored by policy
        print(f"Rate limit exceeded: {e}")
        sys.exit(EXIT_RATE_LIMIT)

def main():
    try:
        # Validate configuration first
        validate_config()

        # Get input file from environment
        input_file = os.getenv('INPUT_FILE')
        if not input_file:
            raise ConfigError("INPUT_FILE not specified")

        # Process the data
        result = process_data(input_file)

        print(f"Processing successful: {result}")
        sys.exit(EXIT_SUCCESS)

    except ConfigError as e:
        print(f"Configuration error: {e}")
        sys.exit(EXIT_CONFIG_ERROR)

    except InvalidInputError as e:
        print(f"Invalid input: {e}")
        sys.exit(EXIT_INVALID_INPUT)

    except TransientError as e:
        print(f"Transient error: {e}")
        sys.exit(EXIT_TRANSIENT_ERROR)

    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(EXIT_TRANSIENT_ERROR)

if __name__ == "__main__":
    main()
```

## Comprehensive Failure Policy

Build a comprehensive policy that handles all your exit codes appropriately:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: comprehensive-handling
spec:
  backoffLimit: 10
  podFailurePolicy:
    rules:
    # Rate limits should not count against backoff
    # Pod will be retried without incrementing failure count
    - action: Ignore
      onExitCodes:
        operator: In
        values: [42]

    # Configuration and input errors should fail immediately
    # No point retrying if config or input is wrong
    - action: FailJob
      onExitCodes:
        operator: In
        values: [2, 3, 4]

    # Transient errors should count against backoff
    # This is the default behavior but made explicit
    - action: Count
      onExitCodes:
        operator: In
        values: [1]

    # Pod disruptions should not count against backoff
    # Infrastructure issues are not application failures
    - action: Ignore
      onPodConditions:
      - type: DisruptionTarget
        status: "True"

  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: processor:latest
        env:
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: api-credentials
              key: api-key
        - name: OUTPUT_BUCKET
          value: "s3://results-bucket"
```

## Handling External Service Dependencies

Distinguish between service unavailability (retriable) and authentication failures (non-retriable):

```go
package main

import (
    "fmt"
    "net/http"
    "os"
    "time"
)

const (
    ExitSuccess          = 0
    ExitTransientError   = 1
    ExitAuthError        = 10
    ExitServiceDown      = 11
    ExitRateLimit        = 42
)

func callExternalService(apiKey string) error {
    client := &http.Client{Timeout: 10 * time.Second}

    req, err := http.NewRequest("GET", "https://api.example.com/data", nil)
    if err != nil {
        return err
    }

    req.Header.Set("Authorization", "Bearer "+apiKey)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        // Network error - retriable
        return &TransientError{Err: err}
    }
    defer resp.Body.Close()

    switch resp.StatusCode {
    case 200:
        // Success
        return nil

    case 401, 403:
        // Authentication/authorization error - not retriable
        return &AuthError{StatusCode: resp.StatusCode}

    case 429:
        // Rate limit - should be ignored by policy
        return &RateLimitError{}

    case 500, 502, 503, 504:
        // Server error - retriable
        return &TransientError{Err: fmt.Errorf("server error: %d", resp.StatusCode)}

    default:
        // Unknown error - treat as transient
        return &TransientError{Err: fmt.Errorf("unexpected status: %d", resp.StatusCode)}
    }
}

type TransientError struct {
    Err error
}

func (e *TransientError) Error() string {
    return fmt.Sprintf("transient error: %v", e.Err)
}

type AuthError struct {
    StatusCode int
}

func (e *AuthError) Error() string {
    return fmt.Sprintf("authentication error: %d", e.StatusCode)
}

type RateLimitError struct{}

func (e *RateLimitError) Error() string {
    return "rate limit exceeded"
}

func main() {
    apiKey := os.Getenv("API_KEY")
    if apiKey == "" {
        fmt.Println("API_KEY not configured")
        os.Exit(2) // Config error
    }

    err := callExternalService(apiKey)
    if err == nil {
        fmt.Println("Success")
        os.Exit(ExitSuccess)
    }

    switch err.(type) {
    case *AuthError:
        fmt.Printf("Authentication failed: %v\n", err)
        os.Exit(ExitAuthError)

    case *RateLimitError:
        fmt.Printf("Rate limited: %v\n", err)
        os.Exit(ExitRateLimit)

    case *TransientError:
        fmt.Printf("Transient error: %v\n", err)
        os.Exit(ExitTransientError)

    default:
        fmt.Printf("Unknown error: %v\n", err)
        os.Exit(ExitTransientError)
    }
}
```

With the corresponding policy:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: external-service-job
spec:
  backoffLimit: 8
  podFailurePolicy:
    rules:
    # Authentication errors - fail immediately
    - action: FailJob
      onExitCodes:
        operator: In
        values: [10]

    # Rate limits - ignore and retry
    - action: Ignore
      onExitCodes:
        operator: In
        values: [42]

    # Service down - count against backoff
    - action: Count
      onExitCodes:
        operator: In
        values: [11]

    # General transient errors - count against backoff
    - action: Count
      onExitCodes:
        operator: In
        values: [1]

  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: service-caller
        image: service-caller:latest
```

## Using Operator NotIn for Default Behavior

Define exceptions rather than listing every case:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: default-retry-policy
spec:
  backoffLimit: 5
  podFailurePolicy:
    rules:
    # Fail immediately on exit codes 2, 3, 4 (config/input errors)
    - action: FailJob
      onExitCodes:
        operator: In
        values: [2, 3, 4]

    # Retry everything else except success (0)
    - action: Count
      onExitCodes:
        operator: NotIn
        values: [0]

  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: processor:latest
```

This catches any unexpected exit codes and treats them as retriable by default, which is safer than failing immediately.

## Handling Pod Conditions

React to infrastructure-level issues differently from application failures:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: infrastructure-aware
spec:
  backoffLimit: 5
  podFailurePolicy:
    rules:
    # Ignore pod disruptions (node maintenance, preemption)
    - action: Ignore
      onPodConditions:
      - type: DisruptionTarget
        status: "True"

    # Ignore out-of-memory kills (need to adjust resources)
    - action: Ignore
      onPodConditions:
      - type: OutOfMemory
        status: "True"

    # Application errors still count
    - action: Count
      onExitCodes:
        operator: NotIn
        values: [0]

  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: processor:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
```

Infrastructure issues don't count against your backoff limit, so application failures can still be retried appropriately.

## Indexed Jobs with Failure Policies

For indexed jobs, you can fail specific indexes while others continue:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: indexed-with-policy
spec:
  completions: 100
  parallelism: 10
  completionMode: Indexed
  backoffLimit: 3
  podFailurePolicy:
    rules:
    # Invalid input for this specific index - fail just this index
    - action: FailIndex
      onExitCodes:
        operator: In
        values: [3]

    # Config error affects all - fail entire job
    - action: FailJob
      onExitCodes:
        operator: In
        values: [2]

    # Transient errors - retry this index
    - action: Count
      onExitCodes:
        operator: In
        values: [1]

  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: indexed-processor:latest
```

The FailIndex action is powerful because it lets you skip bad input while continuing to process other indexes.

## Monitoring and Debugging

Track which failure rules are being triggered:

```bash
# Get job status
kubectl get job comprehensive-handling -o yaml

# Check pod failures
kubectl get pods -l job-name=comprehensive-handling --field-selector=status.phase=Failed

# Get exit codes from failed pods
kubectl get pods -l job-name=comprehensive-handling -o json | \
  jq -r '.items[] |
    select(.status.phase=="Failed") |
    "\(.metadata.name): exit=\(.status.containerStatuses[0].state.terminated.exitCode // "unknown")"'

# Check which pods were ignored vs counted
kubectl describe job comprehensive-handling
```

## Testing Failure Policies

Test your failure policies with a job that exercises different exit codes:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: test-failure-policy
spec:
  backoffLimit: 3
  podFailurePolicy:
    rules:
    - action: FailJob
      onExitCodes:
        operator: In
        values: [2]
    - action: Ignore
      onExitCodes:
        operator: In
        values: [42]
    - action: Count
      onExitCodes:
        operator: In
        values: [1]

  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: tester
        image: busybox
        command:
        - sh
        - -c
        - |
          # Test different scenarios
          TEST_CASE=${TEST_CASE:-1}

          case $TEST_CASE in
            1) echo "Transient error"; exit 1 ;;
            2) echo "Config error"; exit 2 ;;
            42) echo "Rate limit"; exit 42 ;;
            0) echo "Success"; exit 0 ;;
          esac
        env:
        - name: TEST_CASE
          value: "2"  # Change this to test different scenarios
```

Run this with different TEST_CASE values to verify each rule works as expected.

Pod Failure Policies give you fine-grained control over error handling in Kubernetes Jobs. Define clear exit code conventions, map them to appropriate actions, and let Kubernetes handle failures intelligently based on whether they're worth retrying.
