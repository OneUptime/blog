# How to Debug Cascading Failures Across Microservices Using OpenTelemetry Trace Graph Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cascading Failures, Microservices, Dependency Graph, Incident Response

Description: Use OpenTelemetry trace data to build service dependency graphs and trace the propagation path of cascading failures.

A single failing database brings down the payment service, which causes the checkout service to time out, which makes the API gateway return 503 errors, which triggers the mobile app to retry aggressively, which amplifies the load and makes everything worse. Cascading failures are the defining challenge of microservice architectures. OpenTelemetry traces contain the dependency graph you need to understand how failures propagate and where to break the chain.

## Building the Dependency Graph from Traces

Every trace encodes a subgraph of your system architecture. By analyzing the parent-child relationships and service names across traces, you can reconstruct the full dependency graph:

```python
from collections import defaultdict

def build_dependency_graph(traces):
    """
    Build a service dependency graph from trace data.
    Returns edges with call counts and error rates.
    """
    edges = defaultdict(lambda: {"calls": 0, "errors": 0, "total_duration_ms": 0})

    for trace_data in traces:
        spans_by_id = {s["spanId"]: s for s in trace_data["spans"]}

        for span in trace_data["spans"]:
            parent_id = span.get("parentSpanId")
            if not parent_id or parent_id not in spans_by_id:
                continue

            parent = spans_by_id[parent_id]
            caller = parent.get("resource", {}).get("service.name", "unknown")
            callee = span.get("resource", {}).get("service.name", "unknown")

            # Only count cross-service calls
            if caller == callee:
                continue

            edge_key = (caller, callee)
            edges[edge_key]["calls"] += 1
            duration = (span["endTime"] - span["startTime"]) / 1_000_000
            edges[edge_key]["total_duration_ms"] += duration

            if span.get("status", {}).get("code") == "ERROR":
                edges[edge_key]["errors"] += 1

    # Calculate error rates
    result = {}
    for (caller, callee), stats in edges.items():
        result[(caller, callee)] = {
            "calls": stats["calls"],
            "errors": stats["errors"],
            "error_rate": stats["errors"] / stats["calls"] if stats["calls"] > 0 else 0,
            "avg_duration_ms": stats["total_duration_ms"] / stats["calls"],
        }

    return result
```

## Tracing the Failure Propagation Path

When a cascading failure is happening, you need to find the root service. The service where errors first appeared is usually the origin. Here is how to trace the propagation path:

```python
from datetime import datetime, timedelta

def find_failure_origin(dependency_graph, error_timelines):
    """
    Given error rate timelines for each service, find which service
    started failing first and trace the propagation path.
    """
    # error_timelines is a dict: service_name -> [(timestamp, error_rate)]
    first_error_times = {}

    for service, timeline in error_timelines.items():
        for timestamp, error_rate in timeline:
            # Find the first time error rate exceeded 5%
            if error_rate > 0.05:
                first_error_times[service] = timestamp
                break

    if not first_error_times:
        return None

    # Sort services by when they first showed errors
    propagation_order = sorted(
        first_error_times.items(),
        key=lambda x: x[1],
    )

    # Build the propagation path using the dependency graph
    path = []
    for i, (service, first_error_time) in enumerate(propagation_order):
        entry = {
            "service": service,
            "first_error_at": first_error_time,
            "is_origin": i == 0,
        }

        # Find which upstream service likely caused this failure
        if i > 0:
            for prev_service, prev_time in propagation_order[:i]:
                if (prev_service, service) in dependency_graph:
                    entry["caused_by"] = prev_service
                    entry["delay_seconds"] = (
                        first_error_time - prev_time
                    ).total_seconds()
                    break

        path.append(entry)

    return path
```

## Visualizing the Blast Radius

Once you know the origin, calculate the blast radius to see all affected services:

```python
def calculate_blast_radius(dependency_graph, failing_service):
    """
    Find all services that are directly or transitively
    dependent on the failing service.
    """
    # Build adjacency list: callee -> [callers]
    dependents = defaultdict(set)
    for (caller, callee) in dependency_graph:
        dependents[callee].add(caller)

    # BFS from the failing service through its dependents
    affected = set()
    queue = [failing_service]

    while queue:
        current = queue.pop(0)
        for dependent in dependents.get(current, []):
            if dependent not in affected:
                affected.add(dependent)
                queue.append(dependent)

    return affected

# Example usage during an incident
blast = calculate_blast_radius(graph, "postgres-primary")
print(f"Affected services: {blast}")
# Output: {'payment-service', 'checkout-service', 'api-gateway', 'order-service'}
```

## Identifying Missing Circuit Breakers

The dependency graph also reveals where you need circuit breakers. Any edge with a high error rate and no timeout/retry limit is a propagation vector:

```python
def find_missing_circuit_breakers(dependency_graph, traces):
    """
    Find service-to-service edges where errors propagate
    without any circuit breaking behavior.
    """
    recommendations = []

    for (caller, callee), stats in dependency_graph.items():
        if stats["error_rate"] < 0.1:
            continue  # Not enough errors to worry about

        # Check if the caller has retry/circuit breaker spans
        has_circuit_breaker = False
        for trace_data in traces:
            for span in trace_data["spans"]:
                svc = span.get("resource", {}).get("service.name")
                if svc != caller:
                    continue
                # Look for circuit breaker or retry span names
                if any(keyword in span["name"].lower()
                       for keyword in ["circuit", "retry", "fallback", "bulkhead"]):
                    has_circuit_breaker = True
                    break
            if has_circuit_breaker:
                break

        if not has_circuit_breaker:
            recommendations.append({
                "caller": caller,
                "callee": callee,
                "error_rate": round(stats["error_rate"] * 100, 1),
                "recommendation": f"Add circuit breaker in {caller} for calls to {callee}",
            })

    return recommendations
```

## Real-Time Dependency Health Dashboard

Export the dependency graph as metrics for a live dashboard:

```python
from opentelemetry import metrics

meter = metrics.get_meter("dependency-health")

edge_error_rate = meter.create_gauge(
    name="service.dependency.error_rate",
    description="Error rate between service pairs",
    unit="percent",
)

def update_dependency_metrics(dependency_graph):
    for (caller, callee), stats in dependency_graph.items():
        edge_error_rate.set(
            stats["error_rate"] * 100,
            attributes={
                "caller.service": caller,
                "callee.service": callee,
            },
        )
```

## Summary

Cascading failures follow the dependency graph. OpenTelemetry traces encode that graph in every request. By extracting service-to-service edges from your traces, you can build a real-time dependency map, trace the propagation path of failures from origin to blast radius, and identify where circuit breakers are missing. During an incident, this analysis turns chaos into a clear picture of which service started failing, how the failure spread, and where to intervene to stop the cascade.
