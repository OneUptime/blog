# How to Fix Missing Trace Propagation Across Go Goroutines That Were Spawned Without context.Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Trace Propagation, Concurrency

Description: Fix broken trace propagation in Go applications where goroutines were spawned without passing context.Context properly.

When you look at your distributed traces and see fragments instead of a complete request flow, the culprit in Go is almost always a goroutine that was spawned without the proper `context.Context`. This post walks through identifying these breaks and fixing them systematically.

## The Symptom

You instrument your Go service with OpenTelemetry. You see spans being generated. But when you look at the trace view, you get multiple small traces instead of one connected trace. The trace waterfall is broken.

Your service might handle a request like this:

```go
func (s *Server) HandleUpload(w http.ResponseWriter, r *http.Request) {
    ctx, span := s.tracer.Start(r.Context(), "HandleUpload")
    defer span.End()

    file, err := s.parseUpload(ctx, r)
    if err != nil {
        span.RecordError(err)
        http.Error(w, "bad request", 400)
        return
    }

    // Spawn workers without context
    go s.generateThumbnail(file)
    go s.scanForViruses(file)
    go s.indexMetadata(file)

    w.WriteHeader(http.StatusAccepted)
}
```

The three goroutines (`generateThumbnail`, `scanForViruses`, `indexMetadata`) have no context. Any spans they create will be root spans in separate traces.

## Why context.Context Matters for Traces

OpenTelemetry stores the active span inside `context.Context` using Go's context value mechanism. When you call `tracer.Start(ctx, "spanName")`, the SDK looks inside `ctx` for a parent span. If it finds one, the new span becomes a child. If `ctx` is empty (or `context.Background()`), the new span becomes a root.

This is not a design quirk. It is how Go's concurrency model interacts with distributed tracing. Unlike languages with thread-local storage, Go requires you to explicitly pass context.

## Step-by-Step Fix

### Step 1: Audit Your Goroutine Spawning Points

Search your codebase for goroutine launches that do not pass context:

```bash
# Find goroutines that might be missing context
# Look for 'go ' followed by function calls without 'ctx'
grep -rn 'go func()' --include='*.go' .
grep -rn 'go s\.' --include='*.go' .
```

### Step 2: Update Function Signatures

Add `context.Context` as the first parameter to functions called in goroutines:

```go
// Before
func (s *Server) generateThumbnail(file *Upload) error {
    // ...
}

// After
func (s *Server) generateThumbnail(ctx context.Context, file *Upload) error {
    ctx, span := s.tracer.Start(ctx, "generateThumbnail")
    defer span.End()
    // ...
}
```

### Step 3: Pass Context to Goroutines

Update the goroutine spawning code:

```go
func (s *Server) HandleUpload(w http.ResponseWriter, r *http.Request) {
    ctx, span := s.tracer.Start(r.Context(), "HandleUpload")
    defer span.End()

    file, err := s.parseUpload(ctx, r)
    if err != nil {
        span.RecordError(err)
        http.Error(w, "bad request", 400)
        return
    }

    // FIXED: pass context to all goroutines
    go s.generateThumbnail(ctx, file)
    go s.scanForViruses(ctx, file)
    go s.indexMetadata(ctx, file)

    w.WriteHeader(http.StatusAccepted)
}
```

### Step 4: Handle the Fire-and-Forget Case

Wait. The goroutines above are fire-and-forget, and the handler returns immediately. That means the request context will be canceled. You need to detach the context for background work:

```go
// detach extracts span context into a fresh background context
// so the goroutine is not canceled when the request ends.
func detach(ctx context.Context) context.Context {
    return trace.ContextWithSpanContext(
        context.Background(),
        trace.SpanContextFromContext(ctx),
    )
}

func (s *Server) HandleUpload(w http.ResponseWriter, r *http.Request) {
    ctx, span := s.tracer.Start(r.Context(), "HandleUpload")
    defer span.End()

    file, err := s.parseUpload(ctx, r)
    if err != nil {
        span.RecordError(err)
        http.Error(w, "bad request", 400)
        return
    }

    // Detach the context for background goroutines
    bgCtx := detach(ctx)
    go s.generateThumbnail(bgCtx, file)
    go s.scanForViruses(bgCtx, file)
    go s.indexMetadata(bgCtx, file)

    w.WriteHeader(http.StatusAccepted)
}
```

### Step 5: Verify With a Test

Write a test that validates trace continuity:

```go
func TestHandleUpload_TraceConnected(t *testing.T) {
    exporter := tracetest.NewInMemoryExporter()
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithSyncer(exporter),
    )
    otel.SetTracerProvider(tp)

    srv := &Server{tracer: tp.Tracer("test")}

    req := httptest.NewRequest("POST", "/upload", testBody)
    w := httptest.NewRecorder()
    srv.HandleUpload(w, req)

    // Give goroutines time to finish
    time.Sleep(100 * time.Millisecond)
    tp.ForceFlush(context.Background())

    spans := exporter.GetSpans()

    // All spans should share the same trace ID
    traceID := spans[0].SpanContext.TraceID()
    for _, s := range spans {
        if s.SpanContext.TraceID() != traceID {
            t.Errorf("span %q has different trace ID: got %s, want %s",
                s.Name, s.SpanContext.TraceID(), traceID)
        }
    }
}
```

## Pattern for Worker Pools

If you use a worker pool, you need to bundle the context with the job:

```go
type Job struct {
    Ctx  context.Context
    Data interface{}
}

func (p *Pool) Submit(ctx context.Context, data interface{}) {
    p.jobs <- Job{Ctx: ctx, Data: data}
}

func (p *Pool) worker() {
    for job := range p.jobs {
        // Use job.Ctx to maintain trace continuity
        ctx, span := p.tracer.Start(job.Ctx, "pool.process")
        p.process(ctx, job.Data)
        span.End()
    }
}
```

The pattern is consistent: always carry context alongside your data. In Go, context is not automatic. You have to be deliberate about it, and that is especially true when OpenTelemetry is involved.
