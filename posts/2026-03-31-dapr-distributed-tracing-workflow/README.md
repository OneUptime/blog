# How to Implement Distributed Tracing for Workflow Orchestrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Distributed Tracing, OpenTelemetry, Observability

Description: Trace Dapr Workflow orchestrations end-to-end by enriching workflow and activity spans with business context and linking them in a unified trace.

---

## Tracing Dapr Workflow Orchestrations

Dapr Workflow built on the Durable Task Framework automatically creates spans for workflow orchestrations and activity executions. Each workflow instance gets its own trace. You can enrich these spans with business context and add child spans for fine-grained visibility.

## Dapr Tracing Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: workflow-tracing-config
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "http://otel-collector:4318/v1/traces"
      protocol: http
```

## Enriching Workflow Spans

```python
import dapr.ext.workflow as wf
from opentelemetry import trace

tracer = trace.get_tracer("order-workflow", "1.0.0")

def order_fulfillment_workflow(ctx: wf.DaprWorkflowContext, order_input: dict):
    # Enrich the workflow orchestration span
    current_span = trace.get_current_span()
    current_span.set_attribute("workflow.order_id", order_input["orderId"])
    current_span.set_attribute("workflow.customer_tier", order_input.get("customerTier", "free"))
    current_span.set_attribute("workflow.total_items", len(order_input.get("items", [])))

    # Activity 1: validate order
    validation_result = yield ctx.call_activity(
        validate_order_activity, input=order_input
    )
    if not validation_result["valid"]:
        current_span.set_attribute("workflow.status", "rejected")
        current_span.set_attribute("workflow.failed_at", "validation")
        return {"status": "rejected", "reason": validation_result["reason"]}

    # Activity 2: charge payment
    payment_result = yield ctx.call_activity(
        charge_payment_activity, input={
            "orderId": order_input["orderId"],
            "amount": order_input["amount"],
        }
    )
    current_span.set_attribute("workflow.payment_id", payment_result["paymentId"])

    # Activity 3: fulfill
    yield ctx.call_activity(
        fulfill_order_activity, input=order_input
    )

    current_span.set_attribute("workflow.status", "completed")
    return {"status": "fulfilled", "paymentId": payment_result["paymentId"]}
```

## Enriching Activity Spans

```python
def validate_order_activity(ctx: wf.WorkflowActivityContext, order: dict) -> dict:
    span = trace.get_current_span()
    span.set_attribute("activity.order_id", order["orderId"])
    span.set_attribute("activity.item_count", len(order.get("items", [])))

    with tracer.start_as_current_span("run-validation-rules") as child:
        violations = run_validation_rules(order)
        child.set_attribute("violations_found", len(violations))

    valid = len(violations) == 0
    span.set_attribute("activity.valid", valid)
    return {"valid": valid, "reason": violations[0] if violations else None}


def charge_payment_activity(ctx: wf.WorkflowActivityContext, payload: dict) -> dict:
    span = trace.get_current_span()
    span.set_attribute("activity.order_id", payload["orderId"])
    span.set_attribute("activity.amount", payload["amount"])

    with tracer.start_as_current_span("call-payment-gateway") as gateway_span:
        gateway_span.set_attribute("gateway", "stripe")
        result = stripe.charge(payload["amount"])
        gateway_span.set_attribute("payment_id", result["id"])

    span.set_attribute("activity.payment_id", result["id"])
    return {"paymentId": result["id"], "status": result["status"]}
```

## Correlating Workflow Spans with Instance IDs

```python
async def start_order_workflow(order_id: str, order_data: dict):
    instance_id = f"order-{order_id}"

    with tracer.start_as_current_span("start-workflow") as span:
        span.set_attribute("workflow.instance_id", instance_id)
        span.set_attribute("workflow.type", "order-fulfillment-workflow")

        resp = await dapr_client.start_workflow(
            workflow_component="dapr",
            workflow_name="order_fulfillment_workflow",
            input=order_data,
            instance_id=instance_id,
        )
        span.set_attribute("workflow.started", True)

    return instance_id
```

## Querying Workflow Traces

```bash
# Find all spans for a specific workflow instance in Tempo
# { span.workflow.instance_id = "order-abc123" }

# Find failed workflows
# { resource.service.name = "order-workflow" && span.workflow.status = "rejected" }

# Find slow payment activities
# { name = "call-payment-gateway" && duration > 3s }
```

## Summary

Dapr Workflow traces are organized per workflow instance, making it easy to see the full execution timeline of a long-running orchestration. Enriching both workflow and activity spans with business context lets you query traces by order ID, customer tier, or failure reason. Child spans for external calls like payment gateways give precise timing information for each step.
