# How to Trace Error Propagation Chains Across Microservices Using OpenTelemetry Exception Span Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Error Propagation, Microservices, Distributed Tracing

Description: Trace how errors propagate across microservices using OpenTelemetry exception span events to find the true root cause fast.

When a request fails in a microservices architecture, the error you see at the API boundary is rarely the root cause. It is usually a wrapper around a wrapper around the actual failure that happened three services deep. OpenTelemetry distributed traces capture exception events on every span in the chain, giving you the full propagation path. This post shows how to instrument your services to make error propagation visible and how to analyze the chain to find the root cause.

## The Propagation Problem

Here is a typical failure chain:

```
API Gateway: "Downstream service error" (HTTP 502)
  -> Order Service: "Failed to process payment" (gRPC INTERNAL)
    -> Payment Service: "Connection refused to card processor" (TCP error)
```

Without tracing, you see "Downstream service error" in your logs and start guessing. With OpenTelemetry, you see the entire chain in a single trace.

## Instrumenting Error Propagation

The key is recording exceptions at every level of the chain, including both the original error and the wrapped version:

```python
# payment_service.py - The leaf service where the error originates
from opentelemetry import trace

tracer = trace.get_tracer("payment-service")

def charge_card(card_token, amount):
    with tracer.start_as_current_span("charge-card") as span:
        span.set_attribute("payment.amount", amount)
        span.set_attribute("payment.card_token_prefix", card_token[:4])

        try:
            response = card_processor_client.charge(card_token, amount)
            span.set_status(trace.StatusCode.OK)
            return response
        except ConnectionRefusedError as e:
            # This is the root cause - mark it clearly
            span.record_exception(e)
            span.set_attribute("error.is_root_cause", True)
            span.set_attribute("error.origin_service", "payment-service")
            span.set_attribute("error.downstream_dependency", "card-processor")
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise PaymentServiceError(f"Card processor unavailable: {e}") from e
```

```python
# order_service.py - Middle service that catches and wraps the error
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def process_order(order_id):
    with tracer.start_as_current_span("process-order") as span:
        span.set_attribute("order.id", order_id)

        try:
            payment_result = payment_client.charge(order_id)
            span.set_status(trace.StatusCode.OK)
            return payment_result
        except PaymentServiceError as e:
            # This is a propagated error - note the chain
            span.record_exception(e)
            span.set_attribute("error.is_root_cause", False)
            span.set_attribute("error.propagated_from", "payment-service")

            # Also record the original cause if available
            if e.__cause__:
                span.set_attribute(
                    "error.original_type",
                    type(e.__cause__).__name__
                )
                span.set_attribute(
                    "error.original_message",
                    str(e.__cause__)
                )

            span.set_status(trace.StatusCode.ERROR, str(e))
            raise OrderProcessingError(f"Payment failed for order {order_id}: {e}") from e
```

```python
# api_gateway.py - The entry point that the client sees
from opentelemetry import trace

tracer = trace.get_tracer("api-gateway")

def handle_create_order(request):
    with tracer.start_as_current_span("create-order-endpoint") as span:
        span.set_attribute("http.method", "POST")
        span.set_attribute("http.route", "/api/orders")

        try:
            result = order_client.process(request.order_id)
            span.set_status(trace.StatusCode.OK)
            return {"status": "created", "order": result}
        except OrderProcessingError as e:
            span.record_exception(e)
            span.set_attribute("error.is_root_cause", False)
            span.set_attribute("error.propagated_from", "order-service")
            span.set_status(trace.StatusCode.ERROR, str(e))
            return {"error": "Failed to create order"}, 502
```

## Building an Error Chain Analyzer

Once you have traces with propagation metadata, build a tool that reconstructs the error chain:

```python
# error_chain_analyzer.py
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class ErrorNode:
    service: str
    span_name: str
    exception_type: str
    exception_message: str
    is_root_cause: bool
    span_id: str
    timestamp: float

@dataclass
class ErrorChain:
    trace_id: str
    nodes: List[ErrorNode]
    root_cause: Optional[ErrorNode]

class ErrorChainAnalyzer:
    """
    Analyzes a distributed trace to reconstruct the error
    propagation chain and identify the root cause.
    """

    def analyze_trace(self, trace_data):
        """
        Given a trace with multiple error spans, reconstruct
        the propagation chain.
        """
        error_nodes = []

        for span in trace_data.get("spans", []):
            if span.get("status", {}).get("code") != "ERROR":
                continue

            # Extract exception info from span events
            for event in span.get("events", []):
                if event.get("name") == "exception":
                    attrs = event.get("attributes", {})
                    node = ErrorNode(
                        service=span.get("resource", {}).get(
                            "service.name", "unknown"
                        ),
                        span_name=span.get("name", ""),
                        exception_type=attrs.get("exception.type", ""),
                        exception_message=attrs.get("exception.message", ""),
                        is_root_cause=span.get("attributes", {}).get(
                            "error.is_root_cause", False
                        ),
                        span_id=span.get("spanId", ""),
                        timestamp=span.get("startTimeUnixNano", 0),
                    )
                    error_nodes.append(node)

        # Sort by timestamp to get chronological order
        error_nodes.sort(key=lambda n: n.timestamp)

        # Find the root cause
        root_cause = None
        for node in error_nodes:
            if node.is_root_cause:
                root_cause = node
                break

        # If no explicit root cause, use the earliest error
        if not root_cause and error_nodes:
            root_cause = error_nodes[0]

        return ErrorChain(
            trace_id=trace_data.get("traceId", ""),
            nodes=error_nodes,
            root_cause=root_cause,
        )

    def format_chain(self, chain):
        """Format the error chain for human reading."""
        lines = [f"Error Chain for trace {chain.trace_id}:"]
        lines.append(f"Root cause: {chain.root_cause.service} - "
                      f"{chain.root_cause.exception_type}")
        lines.append("")
        lines.append("Propagation path:")

        for i, node in enumerate(chain.nodes):
            prefix = ">>>" if node.is_root_cause else "   "
            lines.append(
                f"  {prefix} [{node.service}] {node.span_name}: "
                f"{node.exception_type} - {node.exception_message}"
            )

        return "\n".join(lines)
```

## Querying Error Chains in Your Trace Backend

If you use Grafana Tempo, you can find traces with multiple error spans using TraceQL:

```
{ status = error && resource.service.name = "api-gateway" }
  >> { status = error && resource.service.name = "order-service" }
  >> { status = error && resource.service.name = "payment-service" }
```

This query finds traces where errors propagated from the payment service through the order service to the API gateway.

## Visualizing Propagation

Most trace viewers show error spans in red. When you open a trace with a propagation chain, you will see a cascade of red spans from the leaf service up to the entry point. The span with `error.is_root_cause=true` is where your investigation should start.

## Conclusion

Tracing error propagation with OpenTelemetry turns "something is broken" into "the card processor connection is refused, which causes payment failures, which causes order creation to fail." By marking root causes explicitly and recording the wrapped exceptions at each level, you give your on-call engineers a clear path from symptom to cause without having to manually correlate logs across services.
