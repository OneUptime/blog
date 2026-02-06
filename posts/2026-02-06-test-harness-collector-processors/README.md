# How to Build a Test Harness for Custom OpenTelemetry Collector Processors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector Processors, Testing, Go, Custom Components

Description: Build a test harness in Go that lets you unit test custom OpenTelemetry Collector processors with real trace and metric data.

Writing a custom OpenTelemetry Collector processor is only half the work. The other half is testing it. The Collector SDK provides interfaces and test utilities that let you feed synthetic data into your processor and inspect what comes out, without running a full Collector instance. This post shows you how to build a proper test harness.

## The Processor Interface

Every Collector processor implements the `processor` interface from the `go.opentelemetry.io/collector/processor` package. For traces, the key method is `ConsumeTraces`, which receives a `ptrace.Traces` object and returns it (possibly modified) to the next consumer in the pipeline.

## A Sample Processor to Test

Let us say you have written a processor that adds a `deployment.environment` attribute to all spans based on a configuration value:

```go
// processor.go
package envprocessor

import (
    "context"

    "go.opentelemetry.io/collector/pdata/ptrace"
    "go.opentelemetry.io/collector/processor"
)

type Config struct {
    Environment string `mapstructure:"environment"`
}

type envProcessor struct {
    config *Config
    next   consumer.Traces
}

func (p *envProcessor) ConsumeTraces(ctx context.Context, td ptrace.Traces) error {
    rss := td.ResourceSpans()
    for i := 0; i < rss.Len(); i++ {
        rs := rss.At(i)
        rs.Resource().Attributes().PutStr("deployment.environment", p.config.Environment)
    }
    return p.next.ConsumeTraces(ctx, td)
}

func (p *envProcessor) Capabilities() consumer.Capabilities {
    return consumer.Capabilities{MutatesData: true}
}
```

## Building the Test Harness

The test harness needs three components: a way to create test data, a mock next consumer to capture output, and the processor itself.

```go
// processor_test.go
package envprocessor

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "go.opentelemetry.io/collector/consumer/consumertest"
    "go.opentelemetry.io/collector/pdata/ptrace"
)

// createTestTraces builds a ptrace.Traces with the specified number of spans
func createTestTraces(spanCount int) ptrace.Traces {
    td := ptrace.NewTraces()
    rs := td.ResourceSpans().AppendEmpty()
    rs.Resource().Attributes().PutStr("service.name", "test-service")

    ss := rs.ScopeSpans().AppendEmpty()
    for i := 0; i < spanCount; i++ {
        span := ss.Spans().AppendEmpty()
        span.SetName("test-span")
        span.SetKind(ptrace.SpanKindServer)
        span.Attributes().PutStr("http.method", "GET")
        span.Attributes().PutInt("http.status_code", 200)
    }

    return td
}

func TestEnvProcessor_AddsEnvironmentAttribute(t *testing.T) {
    // Set up the mock consumer that captures output
    sink := new(consumertest.TracesSink)

    // Create the processor with test config
    cfg := &Config{Environment: "staging"}
    proc := &envProcessor{config: cfg, next: sink}

    // Feed test data through the processor
    input := createTestTraces(3)
    err := proc.ConsumeTraces(context.Background(), input)
    require.NoError(t, err)

    // Verify the output
    output := sink.AllTraces()
    require.Len(t, output, 1)

    // Check that the environment attribute was added
    rs := output[0].ResourceSpans().At(0)
    envValue, exists := rs.Resource().Attributes().Get("deployment.environment")
    assert.True(t, exists, "deployment.environment attribute should exist")
    assert.Equal(t, "staging", envValue.Str())
}

func TestEnvProcessor_PreservesExistingAttributes(t *testing.T) {
    sink := new(consumertest.TracesSink)
    cfg := &Config{Environment: "production"}
    proc := &envProcessor{config: cfg, next: sink}

    input := createTestTraces(1)
    err := proc.ConsumeTraces(context.Background(), input)
    require.NoError(t, err)

    output := sink.AllTraces()
    rs := output[0].ResourceSpans().At(0)

    // The original service.name should still be there
    svcName, exists := rs.Resource().Attributes().Get("service.name")
    assert.True(t, exists)
    assert.Equal(t, "test-service", svcName.Str())

    // And the new attribute should also be present
    env, exists := rs.Resource().Attributes().Get("deployment.environment")
    assert.True(t, exists)
    assert.Equal(t, "production", env.Str())
}
```

## Testing Error Handling

Test what happens when the next consumer returns an error:

```go
func TestEnvProcessor_PropagatesDownstreamErrors(t *testing.T) {
    // Create a consumer that always returns an error
    errorConsumer := consumertest.NewErr(fmt.Errorf("downstream failure"))

    cfg := &Config{Environment: "staging"}
    proc := &envProcessor{config: cfg, next: errorConsumer}

    input := createTestTraces(1)
    err := proc.ConsumeTraces(context.Background(), input)

    // The processor should propagate the error, not swallow it
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "downstream failure")
}
```

## Testing with Realistic Data

For more thorough testing, create traces that mimic real production data:

```go
func createRealisticTrace() ptrace.Traces {
    td := ptrace.NewTraces()

    // Service A - API Gateway
    rsA := td.ResourceSpans().AppendEmpty()
    rsA.Resource().Attributes().PutStr("service.name", "api-gateway")
    ssA := rsA.ScopeSpans().AppendEmpty()
    spanA := ssA.Spans().AppendEmpty()
    spanA.SetName("GET /api/orders")
    spanA.SetKind(ptrace.SpanKindServer)
    spanA.SetTraceID(generateTraceID())
    spanA.SetSpanID(generateSpanID())

    // Service B - Order Service
    rsB := td.ResourceSpans().AppendEmpty()
    rsB.Resource().Attributes().PutStr("service.name", "order-service")
    ssB := rsB.ScopeSpans().AppendEmpty()
    spanB := ssB.Spans().AppendEmpty()
    spanB.SetName("SELECT orders")
    spanB.SetKind(ptrace.SpanKindClient)
    spanB.SetTraceID(spanA.TraceID())  // Same trace
    spanB.SetParentSpanID(spanA.SpanID())
    spanB.Attributes().PutStr("db.system", "postgresql")

    return td
}

func TestEnvProcessor_HandlesMultipleResourceSpans(t *testing.T) {
    sink := new(consumertest.TracesSink)
    cfg := &Config{Environment: "staging"}
    proc := &envProcessor{config: cfg, next: sink}

    input := createRealisticTrace()
    err := proc.ConsumeTraces(context.Background(), input)
    require.NoError(t, err)

    output := sink.AllTraces()
    rss := output[0].ResourceSpans()

    // Both resource spans should have the environment attribute
    for i := 0; i < rss.Len(); i++ {
        env, exists := rss.At(i).Resource().Attributes().Get("deployment.environment")
        assert.True(t, exists, "Resource span %d missing environment", i)
        assert.Equal(t, "staging", env.Str())
    }
}
```

## Running the Tests

```bash
cd your-processor-directory
go test -v -race ./...
```

The `-race` flag is important for Collector processors because they often run concurrently. If your processor has any data races, this will catch them.

Building a proper test harness for Collector processors takes some initial setup, but it pays for itself quickly. Every config change or code update can be validated in milliseconds instead of deploying to a test environment and manually verifying the output.
