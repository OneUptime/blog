# How to Configure Flagger Load Tester with Custom Shell Commands

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Load Testing, Shell, Custom Commands, Kubernetes, Progressive Delivery, Webhook

Description: Learn how to use the Flagger load tester to execute custom shell commands during canary analysis for validation, testing, and integration tasks.

---

## Introduction

The Flagger load tester is not limited to its built-in `hey` and `ghz` load generators. It can execute arbitrary shell commands, making it a versatile tool for running custom validations, integration tests, API calls, and any other task you need during canary analysis.

By setting `type: bash` or `type: cmd` in the webhook metadata, you tell the load tester to execute the command string as a shell command rather than interpreting it as a load test tool invocation. The command's exit code determines the webhook response: exit code 0 produces an HTTP 200 response, and any non-zero exit code produces a non-200 response.

This guide covers how to configure custom shell commands in Flagger webhooks, common patterns, and best practices.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- The Flagger load tester deployed in your cluster
- A Canary resource targeting a Deployment
- kubectl access to your cluster

## Running a Shell Command

To execute a shell command through the load tester, set `type: bash` in the webhook metadata:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    webhooks:
      - name: custom-check
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: "curl -sf http://my-app-canary.default:80/healthz"
```

The `type: bash` tells the load tester to run `cmd` as a shell command. The load tester executes it using a shell interpreter, so standard shell features like pipes, redirects, and environment variables are available.

## Using cmd vs bash Type

The load tester supports two metadata types for custom commands:

- `type: bash` - Executes the command through a shell (`/bin/sh -c`). Supports pipes, redirects, and shell features.
- `type: cmd` - Executes the command directly without a shell wrapper. Better for commands that do not need shell features.

For most use cases, `type: bash` is more flexible:

```yaml
    webhooks:
      - name: check-with-pipes
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sf http://my-app-canary.default:80/api/status | jq -e '.healthy == true'"
```

This pipes the curl output to jq for JSON validation, which requires shell pipe support.

## Running Health Checks

A common use case is running health checks against the canary before or during traffic shifting:

```yaml
    webhooks:
      - name: health-check
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sf http://my-app-canary.default:80/healthz"
```

The `-sf` flags on curl make it fail silently on HTTP errors (`-f`) and suppress progress output (`-s`). A non-200 HTTP response from the canary causes curl to exit with a non-zero code, which makes the webhook return a failure.

## API Validation

Validate specific API responses from the canary:

```yaml
    webhooks:
      - name: api-validation
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: |
            response=$(curl -sf http://my-app-canary.default:80/api/v1/config)
            echo "$response" | jq -e '.version != ""'
            echo "$response" | jq -e '.features | length > 0'
```

This checks that the canary API returns a config with a non-empty version and at least one feature. Each `jq -e` call exits with non-zero if the expression evaluates to false or null.

## Checking External Dependencies

Verify that external dependencies are available before the canary receives traffic:

```yaml
    webhooks:
      - name: dependency-check
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: |
            curl -sf http://database-service.default:5432/health && \
            curl -sf http://cache-service.default:6379/ping && \
            curl -sf http://queue-service.default:5672/api/healthchecks/node
```

The `&&` chaining ensures all three checks must pass. If any fails, the command exits with a non-zero code.

## Running During Each Analysis Step

Use the `rollout` webhook type to run commands during each analysis step alongside or instead of load generation:

```yaml
    webhooks:
      - name: canary-validation
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: |
            curl -sf -X POST \
              -H "Content-Type: application/json" \
              -d '{"key":"test-value"}' \
              http://my-app-canary.default:80/api/validate
```

This runs on every analysis interval, providing continuous validation of the canary.

## Chaining Multiple Commands

Chain commands with `&&` for sequential execution where all must succeed, or `;` for sequential execution regardless of failures:

```yaml
    webhooks:
      - name: multi-step-check
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 120s
        metadata:
          type: bash
          cmd: |
            echo "Step 1: Check canary health" && \
            curl -sf http://my-app-canary.default:80/healthz && \
            echo "Step 2: Validate API schema" && \
            curl -sf http://my-app-canary.default:80/api/schema | jq -e '. | length > 0' && \
            echo "Step 3: Check readiness" && \
            curl -sf http://my-app-canary.default:80/readyz
```

## Setting Timeouts

The `timeout` field on the webhook controls how long Flagger waits for the webhook response. Set it long enough for your command to complete:

```yaml
    webhooks:
      - name: slow-validation
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 300s
        metadata:
          type: bash
          cmd: "my-long-running-test http://my-app-canary.default:80/"
```

If the command takes longer than the timeout, Flagger treats the webhook as failed.

## Error Handling

Commands should exit with appropriate codes. Use `set -e` at the start of multi-line commands to exit on the first error:

```yaml
    webhooks:
      - name: careful-check
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: |
            set -e
            curl -sf http://my-app-canary.default:80/healthz
            curl -sf http://my-app-canary.default:80/readyz
            curl -sf http://my-app-canary.default:80/api/status | jq -e '.ok'
```

With `set -e`, the script exits immediately if any command returns a non-zero exit code, rather than continuing to the next command.

## Conclusion

Custom shell commands in the Flagger load tester extend its capabilities far beyond load generation. By using `type: bash` in webhook metadata, you can run health checks, API validations, dependency verification, and any other command-line task as part of your canary analysis. The exit code convention (0 for success, non-zero for failure) integrates cleanly with Flagger's webhook system, making it straightforward to add custom validation logic to your progressive delivery pipeline.
