# How to Trace Anti-Cheat Detection Pipeline Processing with OpenTelemetry While Protecting Detection Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Gaming, Anti-Cheat, Security, Distributed Tracing

Description: Learn how to instrument your anti-cheat detection pipeline with OpenTelemetry while keeping detection algorithms and thresholds secret.

Anti-cheat systems are one of the hardest things to observe in gaming infrastructure. You absolutely need monitoring to know if the system is working, how fast it processes events, and whether it is catching real cheaters. But you also cannot expose detection logic, thresholds, or algorithms in your telemetry data. If cheaters can read your traces, they know exactly what to avoid.

This post walks through how to instrument an anti-cheat pipeline with OpenTelemetry while keeping the sensitive parts opaque.

## The Security Problem

Standard observability practice says "add detailed attributes to your spans." But for anti-cheat, detailed attributes are dangerous:

- If you tag a span with `detection.algorithm: "speed_threshold_15.2"`, cheaters know the speed limit.
- If you log `detection.confidence: 0.73` and `detection.threshold: 0.80`, they know how close they can get.
- If trace data is stored in a shared observability platform, anyone with access can learn detection secrets.

The solution is to instrument for operational health without leaking detection internals.

## Designing a Safe Instrumentation Layer

Create an abstraction that separates "safe to observe" metadata from sensitive detection data:

```go
package anticheat

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("anticheat-pipeline")

// DetectionCategory uses opaque identifiers instead of descriptive names.
// The mapping from category codes to actual detection types is stored
// separately in a restricted-access document.
type DetectionCategory string

const (
    CategoryA DetectionCategory = "CAT_A"  // actual meaning not in code
    CategoryB DetectionCategory = "CAT_B"
    CategoryC DetectionCategory = "CAT_C"
    CategoryD DetectionCategory = "CAT_D"
)

// SafeAttributes returns only the attributes that are safe to include in traces.
// Never include thresholds, confidence scores, or algorithm details.
func SafeAttributes(playerId string, category DetectionCategory, region string) []attribute.KeyValue {
    return []attribute.KeyValue{
        attribute.String("player.id", playerId),
        attribute.String("detection.category", string(category)),
        attribute.String("server.region", region),
    }
}
```

## Tracing the Detection Pipeline

The pipeline typically runs: event ingestion, feature extraction, detection modules, verdict aggregation, and action enforcement. Trace the pipeline stages without exposing what each stage checks:

```go
func ProcessPlayerEvent(ctx context.Context, event PlayerEvent) (*Verdict, error) {
    ctx, span := tracer.Start(ctx, "anticheat.process_event",
        trace.WithAttributes(
            attribute.String("player.id", event.PlayerID),
            attribute.String("event.type", event.Type),
            attribute.String("server.region", event.Region),
            // Do NOT include: event payload, movement vectors, input data
        ),
    )
    defer span.End()

    // Stage 1: Validate and normalize the event
    normalized, err := normalizeEvent(ctx, event)
    if err != nil {
        span.SetAttributes(attribute.String("error.stage", "normalization"))
        return nil, err
    }

    // Stage 2: Extract features (opaque - we only record timing)
    features, err := extractFeatures(ctx, normalized)
    if err != nil {
        span.SetAttributes(attribute.String("error.stage", "feature_extraction"))
        return nil, err
    }

    // Stage 3: Run detection modules
    results, err := runDetectionModules(ctx, features)
    if err != nil {
        span.SetAttributes(attribute.String("error.stage", "detection"))
        return nil, err
    }

    // Stage 4: Aggregate into a verdict
    verdict := aggregateVerdict(ctx, results)

    // Only record the outcome, not how we got there
    span.SetAttributes(
        attribute.String("verdict.action", string(verdict.Action)),
        attribute.Int("detection.modules_triggered", verdict.ModulesTriggered),
    )

    return verdict, nil
}
```

## Timing Detection Modules Without Exposing Them

You want to know if a particular detection module is slow, but you do not want the span name to reveal what it checks:

```go
func runDetectionModules(ctx context.Context, features *FeatureSet) ([]ModuleResult, error) {
    ctx, span := tracer.Start(ctx, "anticheat.run_modules")
    defer span.End()

    var results []ModuleResult
    for _, module := range registeredModules {
        // Use the module's opaque ID, not its descriptive name
        moduleCtx, moduleSpan := tracer.Start(ctx, "anticheat.module.execute",
            trace.WithAttributes(
                attribute.String("module.id", module.OpaqueID()),
                // module.OpaqueID() returns something like "MOD_7F2A"
                // NOT "speed_hack_detector" or "aimbot_detection"
            ),
        )

        result, err := module.Evaluate(moduleCtx, features)
        if err != nil {
            moduleSpan.SetAttributes(attribute.Bool("module.error", true))
            moduleSpan.End()
            continue
        }

        // Record whether it flagged, but not why or with what confidence
        moduleSpan.SetAttributes(
            attribute.Bool("module.flagged", result.Flagged),
        )
        moduleSpan.End()

        results = append(results, result)
    }

    span.SetAttributes(attribute.Int("modules.total", len(registeredModules)))
    span.SetAttributes(attribute.Int("modules.flagged", countFlagged(results)))

    return results, nil
}
```

## Separating Sensitive Logs from Traces

For debugging purposes, you might need the detailed detection data. Store it in a separate, heavily access-controlled system:

```go
func aggregateVerdict(ctx context.Context, results []ModuleResult) *Verdict {
    _, span := tracer.Start(ctx, "anticheat.aggregate_verdict")
    defer span.End()

    verdict := computeVerdict(results)

    // The trace gets the safe summary
    span.SetAttributes(
        attribute.String("verdict.action", string(verdict.Action)),
    )

    // The detailed breakdown goes to a separate, restricted log system
    // This is NOT sent to the OpenTelemetry collector
    secureAuditLog.Write(SecureLogEntry{
        PlayerID:     verdict.PlayerID,
        ModuleResults: results,         // includes confidence scores, thresholds
        Verdict:      verdict,
        Timestamp:    time.Now(),
    })

    return verdict
}
```

## Metrics for Pipeline Health

Track operational metrics that do not expose detection logic:

```go
var (
    eventsProcessed = meter.Int64Counter("anticheat.events.processed",
        metric.WithDescription("Total events processed by the anti-cheat pipeline"))

    processingLatency = meter.Float64Histogram("anticheat.processing.duration_ms",
        metric.WithDescription("Event processing latency in milliseconds"),
        metric.WithUnit("ms"))

    verdictCounts = meter.Int64Counter("anticheat.verdicts",
        metric.WithDescription("Count of verdicts by action type"))
)
```

These tell you if the pipeline is healthy without revealing what it looks for.

## Access Control for Trace Data

Even with opaque attribute names, restrict who can access anti-cheat traces:

- Route anti-cheat spans to a separate, restricted tenant in your observability backend.
- Use a dedicated OTLP endpoint with authentication.
- Apply role-based access so only the anti-cheat team can query these traces.

## Conclusion

Anti-cheat observability is a balancing act. You need enough data to know the system is fast, reliable, and catching cheaters. But every attribute you add to a span is a potential information leak. The approach here, using opaque identifiers, recording only timing and boolean outcomes, and routing sensitive details to a restricted audit log, gives you operational visibility without handing cheaters a roadmap.
