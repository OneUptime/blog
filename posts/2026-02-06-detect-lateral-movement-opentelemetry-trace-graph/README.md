# How to Detect Lateral Movement Between Microservices Using OpenTelemetry Trace Graph Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Lateral Movement, Security, Trace Analysis

Description: Analyze OpenTelemetry trace graphs to detect lateral movement patterns where an attacker pivots between microservices in your infrastructure.

Lateral movement is when an attacker, after compromising one service, uses that foothold to access other services in the network. In a microservices architecture, this means the attacker moves from service to service, escalating their access along the way. Traditional network monitoring tools often miss this because the traffic looks like normal service-to-service communication. But the patterns in your trace data can reveal it.

This post shows how to analyze OpenTelemetry trace graphs to detect lateral movement indicators.

## What Lateral Movement Looks Like in Traces

Legitimate service-to-service calls follow predictable patterns. Service A calls Service B, Service B calls Service C, and these patterns repeat request after request. Lateral movement introduces anomalies:

- A service makes calls to endpoints it has never called before.
- The call graph depth increases significantly (more hops than usual).
- A service starts calling administrative or configuration endpoints on other services.
- Unusual timing patterns, like a burst of calls to many services in quick succession.

## Collecting the Right Trace Data

First, make sure your services record enough metadata on their spans for graph analysis:

```go
package tracing

import (
    "context"
    "net/http"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("service-mesh-tracer")

// InstrumentOutboundCall wraps an HTTP client call with
// span attributes useful for lateral movement detection
func InstrumentOutboundCall(ctx context.Context, req *http.Request) context.Context {
    ctx, span := tracer.Start(ctx, "http.client.request",
        trace.WithSpanKind(trace.SpanKindClient),
    )

    span.SetAttributes(
        // The destination service and endpoint
        attribute.String("peer.service", req.Host),
        attribute.String("http.path", req.URL.Path),
        attribute.String("http.method", req.Method),

        // The calling service identity
        attribute.String("service.caller", getServiceName()),

        // Whether this is a known call path (compare against baseline)
        attribute.Bool("call_path.known", isKnownCallPath(
            getServiceName(), req.Host, req.URL.Path,
        )),

        // Authentication context propagated with the request
        attribute.String("auth.principal", extractPrincipal(ctx)),
        attribute.String("auth.delegation_chain",
            extractDelegationChain(ctx)),
    )

    return ctx
}

// isKnownCallPath checks if this service-to-service call
// matches the expected service dependency graph
func isKnownCallPath(source, destination, path string) bool {
    knownPaths := map[string][]string{
        "api-gateway":    {"/orders", "/users", "/products"},
        "order-service":  {"/inventory/check", "/payment/process"},
        "user-service":   {"/auth/validate"},
    }

    allowedPaths, exists := knownPaths[source]
    if !exists {
        return false
    }

    for _, p := range allowedPaths {
        if p == path {
            return true
        }
    }
    return false
}
```

## Analyzing Trace Graphs for Anomalies

Build a trace analyzer that processes completed traces and looks for lateral movement patterns. This runs as a batch job against your trace storage:

```python
from collections import defaultdict
from datetime import datetime, timedelta

class LateralMovementDetector:
    """
    Analyzes trace data to detect patterns consistent
    with lateral movement between microservices.
    """

    def __init__(self, trace_store):
        self.trace_store = trace_store
        self.baseline = self.build_baseline()

    def build_baseline(self):
        """
        Build a baseline of normal service call patterns
        from the last 7 days of trace data.
        """
        baseline = {
            "call_pairs": defaultdict(int),
            "avg_depth": {},
            "known_endpoints": defaultdict(set),
            "avg_fan_out": defaultdict(list),
        }

        traces = self.trace_store.query(
            time_range=timedelta(days=7),
        )

        for t in traces:
            spans = t.get_spans()
            for span in spans:
                caller = span.resource_attrs.get("service.name")
                callee = span.attrs.get("peer.service")
                path = span.attrs.get("http.path")

                if callee:
                    key = f"{caller}->{callee}"
                    baseline["call_pairs"][key] += 1
                    baseline["known_endpoints"][key].add(path)

            # Track typical trace depth
            depth = self.calculate_trace_depth(spans)
            root_service = spans[0].resource_attrs.get("service.name")
            if root_service not in baseline["avg_depth"]:
                baseline["avg_depth"][root_service] = []
            baseline["avg_depth"][root_service].append(depth)

        return baseline

    def analyze_trace(self, t):
        """
        Analyze a single trace for lateral movement indicators.
        Returns a list of findings.
        """
        findings = []
        spans = t.get_spans()

        # Check 1: Unknown call pairs
        for span in spans:
            caller = span.resource_attrs.get("service.name")
            callee = span.attrs.get("peer.service")
            path = span.attrs.get("http.path")

            if not callee:
                continue

            key = f"{caller}->{callee}"

            if key not in self.baseline["call_pairs"]:
                findings.append({
                    "type": "unknown_call_pair",
                    "severity": "high",
                    "trace_id": t.trace_id,
                    "caller": caller,
                    "callee": callee,
                    "path": path,
                    "message": (
                        f"Service {caller} called {callee} "
                        f"which is not in the baseline"
                    ),
                })

            elif path not in self.baseline["known_endpoints"].get(key, set()):
                findings.append({
                    "type": "unknown_endpoint",
                    "severity": "medium",
                    "trace_id": t.trace_id,
                    "caller": caller,
                    "callee": callee,
                    "path": path,
                    "message": (
                        f"Service {caller} called {callee}{path} "
                        f"which is a new endpoint"
                    ),
                })

        # Check 2: Unusual trace depth
        depth = self.calculate_trace_depth(spans)
        root_service = spans[0].resource_attrs.get("service.name")
        avg_depths = self.baseline["avg_depth"].get(root_service, [])
        if avg_depths:
            avg = sum(avg_depths) / len(avg_depths)
            if depth > avg * 2:
                findings.append({
                    "type": "unusual_depth",
                    "severity": "medium",
                    "trace_id": t.trace_id,
                    "depth": depth,
                    "average_depth": avg,
                    "message": (
                        f"Trace depth {depth} is more than "
                        f"double the average {avg:.1f}"
                    ),
                })

        # Check 3: Rapid fan-out (one service calling many others)
        fan_out = self.calculate_fan_out(spans)
        for service, count in fan_out.items():
            if count > 10:
                findings.append({
                    "type": "high_fan_out",
                    "severity": "high",
                    "trace_id": t.trace_id,
                    "service": service,
                    "fan_out": count,
                    "message": (
                        f"Service {service} called {count} "
                        f"distinct services in a single trace"
                    ),
                })

        return findings

    def calculate_trace_depth(self, spans):
        # Build parent-child relationships and find max depth
        children = defaultdict(list)
        root = None
        for span in spans:
            if span.parent_span_id:
                children[span.parent_span_id].append(span.span_id)
            else:
                root = span.span_id

        def depth(node_id):
            if node_id not in children:
                return 1
            return 1 + max(depth(c) for c in children[node_id])

        return depth(root) if root else 0

    def calculate_fan_out(self, spans):
        fan_out = defaultdict(set)
        for span in spans:
            caller = span.resource_attrs.get("service.name")
            callee = span.attrs.get("peer.service")
            if callee:
                fan_out[caller].add(callee)
        return {k: len(v) for k, v in fan_out.items()}
```

## Emitting Detection Results as OTel Events

When the detector finds something suspicious, emit it back into the OpenTelemetry pipeline:

```python
from opentelemetry import trace, metrics

meter = metrics.get_meter("lateral-movement-detector")
detection_counter = meter.create_counter(
    "security.lateral_movement.detections",
    description="Lateral movement pattern detections",
)

def emit_finding(finding):
    detection_counter.add(1, {
        "detection.type": finding["type"],
        "detection.severity": finding["severity"],
        "source.service": finding.get("caller", "unknown"),
    })
```

## Summary

Lateral movement detection is about finding anomalies in your service call graph. OpenTelemetry traces give you the raw data: which services call which, what endpoints they hit, and how deep the call chains go. By building a baseline of normal behavior and comparing incoming traces against it, you can flag patterns that suggest an attacker is moving between services. The key data points are unknown call pairs, new endpoints, unusual trace depth, and high fan-out from a single service.
