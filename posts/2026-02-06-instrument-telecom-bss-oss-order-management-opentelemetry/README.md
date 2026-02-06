# How to Instrument Telecom BSS/OSS Order Management Flows with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, BSS, OSS, Order Management, Telecommunications

Description: Instrument telecom BSS/OSS order management workflows with OpenTelemetry to trace service orders from submission to fulfillment.

Telecom order management is a complex orchestration of systems. When a customer orders a new broadband connection or upgrades their mobile plan, the request flows through CRM, product catalog, inventory, provisioning, activation, and billing systems. A failure at any point means a delayed or failed order, and every day of delay increases the risk of customer churn. OpenTelemetry lets you trace the entire order lifecycle across all these systems.

## Order Management Architecture

A typical telecom BSS/OSS order flow touches these systems:

- **CRM / Digital Channel**: Order capture
- **Product Catalog**: Service decomposition into technical components
- **Order Management System (OMS)**: Orchestration engine
- **Inventory Management**: Resource allocation (ports, IP addresses, equipment)
- **Network Provisioning**: Configuration of network elements
- **Activation**: Service activation and testing
- **Billing**: Account and rating plan setup

## Instrumenting the Order Management System

```python
# order_management.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode, SpanKind
from opentelemetry.context import attach, detach
import time

tracer = trace.get_tracer("bss.order_management")
meter = metrics.get_meter("bss.order_management")

# Order lifecycle metrics
order_counter = meter.create_counter(
    "bss.order.count",
    description="Number of orders by type and status",
    unit="{order}",
)

order_duration = meter.create_histogram(
    "bss.order.duration",
    description="End-to-end order fulfillment duration",
    unit="s",
)

order_step_duration = meter.create_histogram(
    "bss.order.step_duration",
    description="Duration of each order fulfillment step",
    unit="ms",
)

# Track orders stuck in each state
orders_in_progress = meter.create_up_down_counter(
    "bss.order.in_progress",
    description="Orders currently in progress by state",
    unit="{order}",
)

# Fallout tracking (orders that need manual intervention)
fallout_counter = meter.create_counter(
    "bss.order.fallout",
    description="Orders that fell out of automated processing",
    unit="{order}",
)


class OrderTracer:
    """Traces a single service order through the BSS/OSS stack."""

    def __init__(self, order_id: str, order_data: dict):
        self.order_id = order_id
        self.order_data = order_data
        self.root_span = None

    def start_order(self):
        """Begin tracing when an order is submitted."""
        self.root_span = tracer.start_span(
            "bss.order.lifecycle",
            kind=SpanKind.SERVER,
            attributes={
                "bss.order_id": self.order_id,
                "bss.order_type": self.order_data["type"],
                "bss.customer_id": self.order_data["customer_id"],
                "bss.product_offering": self.order_data["product"],
                "bss.channel": self.order_data.get("channel", "web"),
                "bss.priority": self.order_data.get("priority", "normal"),
            },
        )
        orders_in_progress.add(1, {"state": "submitted"})
        order_counter.add(1, {
            "type": self.order_data["type"],
            "status": "submitted",
        })

    def trace_decomposition(self):
        """Trace the product catalog decomposition step."""
        ctx = trace.set_span_in_context(self.root_span)

        with tracer.start_as_current_span(
            "bss.order.decompose", context=ctx
        ) as span:
            start = time.time()

            span.set_attribute("bss.order_id", self.order_id)

            # Query product catalog to decompose offering into service specs
            service_specs = decompose_product(
                self.order_data["product"],
                self.order_data.get("options", {})
            )

            span.set_attributes({
                "bss.decomposition.service_count": len(service_specs),
                "bss.decomposition.services":
                    ",".join([s.name for s in service_specs]),
            })

            elapsed = (time.time() - start) * 1000
            order_step_duration.record(elapsed, {"step": "decomposition"})

            return service_specs

    def trace_inventory_allocation(self, service_specs: list):
        """Trace the resource allocation from inventory."""
        ctx = trace.set_span_in_context(self.root_span)

        with tracer.start_as_current_span(
            "bss.order.allocate_inventory", context=ctx
        ) as span:
            start = time.time()
            allocated_resources = []

            for spec in service_specs:
                with tracer.start_as_current_span(
                    f"bss.inventory.allocate.{spec.resource_type}"
                ) as alloc_span:
                    alloc_span.set_attributes({
                        "bss.resource_type": spec.resource_type,
                        "bss.location": self.order_data.get("service_address"),
                    })

                    resource = allocate_resource(spec)

                    if resource:
                        alloc_span.set_attribute("bss.resource_id", resource.id)
                        allocated_resources.append(resource)
                    else:
                        alloc_span.set_status(
                            StatusCode.ERROR,
                            f"No available {spec.resource_type}"
                        )
                        fallout_counter.add(1, {
                            "reason": "no_inventory",
                            "resource_type": spec.resource_type,
                        })
                        # This order needs manual intervention
                        orders_in_progress.add(-1, {"state": "submitted"})
                        orders_in_progress.add(1, {"state": "fallout"})
                        return None

            span.set_attribute(
                "bss.allocated_resources",
                len(allocated_resources)
            )
            elapsed = (time.time() - start) * 1000
            order_step_duration.record(elapsed, {"step": "inventory"})

            return allocated_resources

    def trace_provisioning(self, resources: list):
        """Trace the network provisioning step."""
        ctx = trace.set_span_in_context(self.root_span)

        with tracer.start_as_current_span(
            "bss.order.provision", context=ctx
        ) as span:
            start = time.time()

            for resource in resources:
                with tracer.start_as_current_span(
                    f"bss.provision.{resource.type}"
                ) as prov_span:
                    prov_span.set_attributes({
                        "bss.resource_id": resource.id,
                        "bss.resource_type": resource.type,
                        "bss.network_element": resource.network_element,
                    })

                    result = provision_resource(resource)
                    prov_span.set_attribute("bss.provision.result", result.status)

                    if result.status == "failed":
                        prov_span.set_status(StatusCode.ERROR, result.error)
                        fallout_counter.add(1, {
                            "reason": "provisioning_failed",
                            "resource_type": resource.type,
                        })

            elapsed = (time.time() - start) * 1000
            order_step_duration.record(elapsed, {"step": "provisioning"})

    def trace_activation(self):
        """Trace the service activation step."""
        ctx = trace.set_span_in_context(self.root_span)

        with tracer.start_as_current_span(
            "bss.order.activate", context=ctx
        ) as span:
            start = time.time()

            activation_result = activate_service(self.order_id)
            span.set_attributes({
                "bss.activation.result": activation_result.status,
                "bss.activation.test_call": activation_result.test_passed,
            })

            if activation_result.status == "active":
                order_counter.add(1, {
                    "type": self.order_data["type"],
                    "status": "completed",
                })
            else:
                span.set_status(StatusCode.ERROR, "Activation failed")

            elapsed = (time.time() - start) * 1000
            order_step_duration.record(elapsed, {"step": "activation"})

    def trace_billing_setup(self):
        """Trace the billing system configuration."""
        ctx = trace.set_span_in_context(self.root_span)

        with tracer.start_as_current_span(
            "bss.order.billing_setup", context=ctx
        ) as span:
            start = time.time()

            billing_result = setup_billing(
                self.order_data["customer_id"],
                self.order_data["product"],
            )
            span.set_attributes({
                "bss.billing.account_id": billing_result.account_id,
                "bss.billing.plan_id": billing_result.plan_id,
                "bss.billing.effective_date": billing_result.effective_date,
            })

            elapsed = (time.time() - start) * 1000
            order_step_duration.record(elapsed, {"step": "billing"})

    def complete(self):
        """Mark the order as complete."""
        if self.root_span:
            orders_in_progress.add(-1, {"state": "submitted"})
            self.root_span.set_status(StatusCode.OK)
            self.root_span.end()
```

## Key Insights from Order Tracing

With this instrumentation, you can answer questions like:

- **Which step takes the longest?** Usually it is provisioning or inventory allocation. The histogram data shows you the distribution, not just averages.
- **What causes fallout?** The fallout counter broken down by reason tells you if it is inventory shortages, provisioning failures, or something else.
- **Which products have the highest failure rate?** Break down order completion rates by product offering.
- **Are certain channels worse?** Compare completion rates and durations for web vs. call center vs. retail orders.

## Alerting Recommendations

- **Order fallout rate above 10%**: Something systemic is broken. Check inventory levels and provisioning system health.
- **Average order duration exceeds SLA**: If your SLA says 24 hours and the average is climbing toward 20, act before you breach.
- **Provisioning step failure rate spikes**: Often indicates a network element management system issue.
- **Billing setup failures**: These are especially bad because the customer has service but you cannot charge them.

Order management tracing with OpenTelemetry transforms a black-box process into a fully visible pipeline. Instead of learning about order failures from angry customers, you detect and fix them proactively.
