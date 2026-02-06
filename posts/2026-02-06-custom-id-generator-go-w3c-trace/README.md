# How to Build a Custom ID Generator in Go That Meets W3C Trace Context Level 2 Randomness Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, W3C Trace Context, ID Generator

Description: Build a custom OpenTelemetry ID generator in Go that satisfies the W3C Trace Context Level 2 randomness requirements for trace IDs.

The W3C Trace Context Level 2 specification tightens the requirements around trace ID generation. Specifically, it requires that the rightmost 7 bytes of a trace ID contain random or pseudo-random values with sufficient entropy. This is to ensure that sampling decisions based on trace ID bits work correctly across vendors. The default Go SDK ID generator already meets these requirements, but if you need a custom generator (for embedding metadata in the ID), you need to be careful about maintaining the randomness guarantees.

## W3C Trace Context Level 2 Requirements

The key requirement is in section 3.2.2 of the spec: the `trace-id` field should have a random (or pseudo-random) portion that is uniformly distributed. The rightmost 56 bits (7 bytes) must be random, because some systems use these bits for probability-based sampling decisions.

If your custom generator zeroes out or uses deterministic values in those bytes, trace-based sampling may break across different vendors in the trace.

## The Go IDGenerator Interface

```go
package trace

// IDGenerator allows custom generation of TraceID and SpanID.
type IDGenerator interface {
    NewIDs(ctx context.Context) (trace.TraceID, trace.SpanID)
    NewSpanID(ctx context.Context, traceID trace.TraceID) trace.SpanID
}
```

## Building a Compliant Custom Generator

Here is a generator that embeds a timestamp in the first 9 bytes while keeping the last 7 bytes fully random:

```go
package traceid

import (
    "context"
    "crypto/rand"
    "encoding/binary"
    "sync"
    "time"

    "go.opentelemetry.io/otel/trace"
)

// TimestampIDGenerator embeds a timestamp in trace IDs while
// keeping the last 7 bytes random per W3C Trace Context Level 2.
type TimestampIDGenerator struct {
    // Pool for reusing byte slices during ID generation
    pool sync.Pool
}

func NewTimestampIDGenerator() *TimestampIDGenerator {
    return &TimestampIDGenerator{
        pool: sync.Pool{
            New: func() interface{} {
                b := make([]byte, 16)
                return &b
            },
        },
    }
}

func (g *TimestampIDGenerator) NewIDs(ctx context.Context) (trace.TraceID, trace.SpanID) {
    traceID := g.generateTraceID()
    spanID := g.generateSpanID()
    return traceID, spanID
}

func (g *TimestampIDGenerator) NewSpanID(ctx context.Context, traceID trace.TraceID) trace.SpanID {
    return g.generateSpanID()
}

func (g *TimestampIDGenerator) generateTraceID() trace.TraceID {
    var tid trace.TraceID

    // Bytes 0-8 (9 bytes): Timestamp with sub-millisecond precision
    // This gives us time-sortable trace IDs
    now := time.Now()
    secs := now.Unix()
    nanos := now.Nanosecond()

    // Pack seconds into first 5 bytes (enough until year 36812)
    tid[0] = byte(secs >> 32)
    tid[1] = byte(secs >> 24)
    tid[2] = byte(secs >> 16)
    tid[3] = byte(secs >> 8)
    tid[4] = byte(secs)

    // Pack nanoseconds into next 4 bytes
    binary.BigEndian.PutUint32(tid[5:9], uint32(nanos))

    // Bytes 9-15 (7 bytes): Cryptographically random
    // This satisfies W3C Trace Context Level 2 requirements
    // The rightmost 7 bytes MUST be random
    _, err := rand.Read(tid[9:16])
    if err != nil {
        // Fallback: should never happen with crypto/rand
        panic("failed to generate random bytes for trace ID: " + err.Error())
    }

    // Verify the ID is not all zeros (extremely unlikely but required)
    if tid == (trace.TraceID{}) {
        return g.generateTraceID()
    }

    return tid
}

func (g *TimestampIDGenerator) generateSpanID() trace.SpanID {
    var sid trace.SpanID

    // Span IDs should be fully random
    _, err := rand.Read(sid[:])
    if err != nil {
        panic("failed to generate random bytes for span ID: " + err.Error())
    }

    // Ensure non-zero
    if sid == (trace.SpanID{}) {
        return g.generateSpanID()
    }

    return sid
}
```

## Why crypto/rand Instead of math/rand

The W3C spec says the random portion should be "uniformly distributed." While `math/rand` produces uniform distributions, `crypto/rand` provides cryptographic-quality randomness that is harder to predict. For trace IDs that might be visible in logs and HTTP headers, using `crypto/rand` prevents potential information leakage about the random number generator state.

```go
// Using crypto/rand - recommended for trace IDs
import "crypto/rand"
_, err := rand.Read(buf)

// Using math/rand - acceptable but less secure
// import "math/rand/v2"
// rand.Read(buf)
```

The performance difference is minimal for trace ID generation since you only generate one ID per trace.

## Registering the Generator

```go
package main

import (
    "context"
    "log"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "myapp/traceid"
)

func main() {
    ctx := context.Background()

    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        log.Fatal(err)
    }

    res, _ := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("my-service"),
        ),
    )

    // Register the custom ID generator with the TracerProvider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithIDGenerator(traceid.NewTimestampIDGenerator()),
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
    )
    otel.SetTracerProvider(tp)
    defer tp.Shutdown(ctx)

    // Use the tracer as normal - IDs will be generated by your custom generator
    tracer := otel.Tracer("my-service")
    _, span := tracer.Start(ctx, "test-operation")
    log.Printf("Trace ID: %s", span.SpanContext().TraceID())
    span.End()
}
```

## Testing for W3C Compliance

Write tests that verify the randomness and format requirements:

```go
package traceid

import (
    "context"
    "testing"

    "go.opentelemetry.io/otel/trace"
)

func TestTraceIDFormat(t *testing.T) {
    gen := NewTimestampIDGenerator()
    traceID, spanID := gen.NewIDs(context.Background())

    // Must not be zero
    if traceID == (trace.TraceID{}) {
        t.Error("trace ID must not be zero")
    }
    if spanID == (trace.SpanID{}) {
        t.Error("span ID must not be zero")
    }

    // Must be valid (IsValid checks for non-zero)
    sc := trace.NewSpanContext(trace.SpanContextConfig{
        TraceID: traceID,
        SpanID:  spanID,
    })
    if !sc.IsValid() {
        t.Error("generated span context is not valid")
    }
}

func TestRandomnessInLastSevenBytes(t *testing.T) {
    gen := NewTimestampIDGenerator()
    seen := make(map[[7]byte]bool)

    // Generate many IDs and check the last 7 bytes are unique
    for i := 0; i < 10000; i++ {
        traceID, _ := gen.NewIDs(context.Background())
        var last7 [7]byte
        copy(last7[:], traceID[9:16])
        if seen[last7] {
            t.Fatalf("duplicate random portion detected at iteration %d", i)
        }
        seen[last7] = true
    }
}
```

Custom ID generators in Go give you flexibility to embed useful metadata in trace IDs while staying compliant with the W3C specification. The critical rule is simple: keep the rightmost 7 bytes random, and you will maintain compatibility with probability-based sampling across the distributed tracing ecosystem.
