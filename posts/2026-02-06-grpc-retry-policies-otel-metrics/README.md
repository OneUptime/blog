# How to Track gRPC Retry Policies and Attempt Counts Using OpenTelemetry Per-Call

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Retry Policies, Per-Attempt Metrics

Description: Track gRPC retry policies and per-attempt metrics with OpenTelemetry to understand retry behavior and spot failing backends.

gRPC has built-in retry support through service configs. When a call fails with a retryable status code, the client automatically retries it. But how do you know if retries are actually happening? Are they succeeding on the second attempt or burning through all attempts and still failing? gRPC's built-in OpenTelemetry metrics give you per-call and per-attempt visibility into service-config retry behavior. The custom examples below show the same per-call and per-attempt shape for manual retry loops.

## gRPC Retry Configuration

First, here is what a gRPC retry policy looks like in the service config:

```json
{
  "methodConfig": [{
    "name": [{"service": "mypackage.MyService"}],
    "retryPolicy": {
      "maxAttempts": 4,
      "initialBackoff": "0.1s",
      "maxBackoff": "1s",
      "backoffMultiplier": 2,
      "retryableStatusCodes": ["UNAVAILABLE", "DEADLINE_EXCEEDED"]
    }
  }]
}
```

## Defining Per-Call and Per-Attempt Metrics

```go
package main

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

var meter = otel.Meter("grpc.retry.monitoring")

var (
    // Per-call metrics (one data point per logical RPC)
    callsTotal      metric.Int64Counter
    callDuration    metric.Float64Histogram
    attemptsPerCall metric.Int64Histogram

    // Per-attempt metrics (one data point per retry attempt)
    attemptTotal    metric.Int64Counter
    attemptDuration metric.Float64Histogram
)

func initRetryMetrics() {
    var err error

    callsTotal, err = meter.Int64Counter(
        "grpc.client.call.total",
        metric.WithDescription("Total logical RPC calls (regardless of retries)"),
    )
    check(err)

    callDuration, err = meter.Float64Histogram(
        "grpc.client.call.duration",
        metric.WithDescription("Total duration of a logical call including all retry attempts"),
        metric.WithUnit("ms"),
    )
    check(err)

    attemptsPerCall, err = meter.Int64Histogram(
        "grpc.client.call.attempts",
        metric.WithDescription("Number of attempts per logical call"),
        metric.WithUnit("1"),
    )
    check(err)

    attemptTotal, err = meter.Int64Counter(
        "grpc.client.attempt.total",
        metric.WithDescription("Total individual RPC attempts including retries"),
    )
    check(err)

    attemptDuration, err = meter.Float64Histogram(
        "grpc.client.attempt.duration",
        metric.WithDescription("Duration of a single RPC attempt"),
        metric.WithUnit("ms"),
    )
    check(err)
}

func check(err error) {
    if err != nil {
        panic(err)
    }
}
```

## Interceptor That Tracks Manual Retries

```go
func retryTrackingInterceptor() grpc.UnaryClientInterceptor {
    const maxAttempts = 4

    return func(
        ctx context.Context,
        method string,
        req, reply interface{},
        cc *grpc.ClientConn,
        invoker grpc.UnaryInvoker,
        opts ...grpc.CallOption,
    ) error {
        callStart := time.Now()
        attemptCount := 0
        var lastErr error

        // Service-config retries happen inside gRPC and are not exposed as
        // separate invoker calls. This loop is for manual retries.
        for attempt := 0; attempt < maxAttempts; attempt++ {
            attemptCount++
            attemptStart := time.Now()

            err := invoker(ctx, method, req, reply, cc, opts...)
            attemptElapsed := float64(time.Since(attemptStart).Milliseconds())
            code := status.Code(err)

            attemptAttrs := []attribute.KeyValue{
                attribute.String("grpc.method", method),
                attribute.Int("grpc.retry.attempt_number", attempt+1),
                attribute.String("grpc.status_code", code.String()),
            }

            attemptTotal.Add(ctx, 1, metric.WithAttributes(attemptAttrs...))
            attemptDuration.Record(ctx, attemptElapsed, metric.WithAttributes(attemptAttrs...))

            if err == nil {
                // Success
                lastErr = nil
                break
            }

            lastErr = err

            // Check if the error is retryable
            if !isRetryable(code) || attempt == maxAttempts-1 {
                break
            }

            // Apply backoff before the next attempt
            time.Sleep(backoff(attempt))
        }

        // Record per-call metrics
        callElapsed := float64(time.Since(callStart).Milliseconds())
        finalStatus := status.Code(lastErr).String()

        callAttrs := []attribute.KeyValue{
            attribute.String("grpc.method", method),
            attribute.String("grpc.final_status_code", finalStatus),
            attribute.Bool("grpc.retry.occurred", attemptCount > 1),
        }

        callsTotal.Add(ctx, 1, metric.WithAttributes(callAttrs...))
        callDuration.Record(ctx, callElapsed, metric.WithAttributes(callAttrs...))
        attemptsPerCall.Record(ctx, int64(attemptCount), metric.WithAttributes(callAttrs...))

        return lastErr
    }
}

func isRetryable(code codes.Code) bool {
    return code == codes.Unavailable || code == codes.DeadlineExceeded
}

func backoff(attempt int) time.Duration {
    base := 100 * time.Millisecond
    for i := 0; i < attempt; i++ {
        base *= 2
    }
    if base > 1*time.Second {
        base = 1 * time.Second
    }
    return base
}
```

## Python Manual Retry Wrapper

```python
import grpc
import time
from opentelemetry import metrics

meter = metrics.get_meter("grpc.retry.monitoring")

calls_total = meter.create_counter("grpc.client.call.total")
call_duration = meter.create_histogram("grpc.client.call.duration", unit="ms")
attempts_per_call = meter.create_histogram("grpc.client.call.attempts")
attempt_total = meter.create_counter("grpc.client.attempt.total")
attempt_duration = meter.create_histogram("grpc.client.attempt.duration", unit="ms")

def call_with_retry(stub_method, request, method_name, max_retries=3, retryable_codes=None):
    retryable_codes = retryable_codes or [
        grpc.StatusCode.UNAVAILABLE,
        grpc.StatusCode.DEADLINE_EXCEEDED,
    ]
    call_start = time.time()
    attempt_count = 0
    last_error = None

    for attempt in range(max_retries + 1):
        attempt_count += 1
        attempt_start = time.time()

        try:
            response = stub_method(request)
            attempt_ms = (time.time() - attempt_start) * 1000

            attempt_total.add(1, {
                "grpc.method": method_name,
                "grpc.retry.attempt_number": attempt + 1,
                "grpc.status_code": "OK",
            })
            attempt_duration.record(attempt_ms, {
                "grpc.method": method_name,
                "grpc.retry.attempt_number": attempt + 1,
                "grpc.status_code": "OK",
            })

            last_error = None
            break

        except grpc.RpcError as e:
            attempt_ms = (time.time() - attempt_start) * 1000
            status_code = e.code().name

            attempt_total.add(1, {
                "grpc.method": method_name,
                "grpc.retry.attempt_number": attempt + 1,
                "grpc.status_code": status_code,
            })
            attempt_duration.record(attempt_ms, {
                "grpc.method": method_name,
                "grpc.retry.attempt_number": attempt + 1,
                "grpc.status_code": status_code,
            })

            last_error = e
            if e.code() not in retryable_codes or attempt == max_retries:
                break

    final_status = "OK" if last_error is None else last_error.code().name
    call_attrs = {
        "grpc.method": method_name,
        "grpc.final_status_code": final_status,
        "grpc.retry.occurred": str(attempt_count > 1).lower(),
    }

    # Record per-call metrics
    call_ms = (time.time() - call_start) * 1000
    calls_total.add(1, call_attrs)
    call_duration.record(call_ms, call_attrs)
    attempts_per_call.record(attempt_count, call_attrs)

    if last_error:
        raise last_error
    return response
```

## Key Queries

```promql
# Retry rate: what fraction of calls needed retries

sum(rate(grpc_client_call_total{grpc_retry_occurred="true"}[5m]))
/
sum(rate(grpc_client_call_total[5m]))

# Average attempts per call (should be close to 1 if things are healthy)
sum(rate(grpc_client_call_attempts_sum[5m]))
/
sum(rate(grpc_client_call_attempts_count[5m]))

# Attempt success rate by attempt number (do retries actually help?)
sum(rate(grpc_client_attempt_total{grpc_status_code="OK"}[5m])) by (grpc_retry_attempt_number)
/
sum(rate(grpc_client_attempt_total[5m])) by (grpc_retry_attempt_number)
```

These metrics tell you whether your retry policy is actually helping or just adding latency. If the success rate on attempt 2 is nearly the same as attempt 1, your retries are wasting time and you should look at the root cause instead.
