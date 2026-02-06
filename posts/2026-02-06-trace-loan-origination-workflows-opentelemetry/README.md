# How to Trace Loan Origination System Workflows (Application, Underwriting, Approval) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Loan Origination, Distributed Tracing, Financial Services

Description: A practical guide to tracing loan origination workflows from application through underwriting to approval using OpenTelemetry distributed tracing.

Loan origination is one of those workflows that spans multiple services, involves human decision points, and can take anywhere from minutes to weeks to complete. Tracing these long-running processes with OpenTelemetry requires a different approach than tracing a simple HTTP request. This post covers how to instrument each phase of the loan lifecycle so that you can track a single application from submission all the way through to funding.

## The Loan Origination Pipeline

A typical loan origination system (LOS) has several distinct phases:

1. **Application intake** - borrower submits their information
2. **Credit pull** - automated credit bureau queries
3. **Document collection** - gathering pay stubs, tax returns, etc.
4. **Underwriting** - risk assessment and decision
5. **Approval/Denial** - final decision and terms
6. **Closing** - document signing and funding

Each of these steps might be handled by a different microservice, and the entire workflow could span days. Standard request-scoped traces do not work here. Instead, we use linked spans and a shared loan context.

## Propagating Loan Context Across Services

The key idea is to attach the loan application ID as a baggage item and create linked spans rather than one enormous trace.

```python
from opentelemetry import trace, baggage, context
from opentelemetry.trace import Link
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanExporter(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("loan-origination")

def submit_application(borrower_data):
    """Handle a new loan application submission."""
    with tracer.start_as_current_span("loan.application.submit") as span:
        # Generate the loan application ID
        loan_id = generate_loan_id()
        span.set_attribute("loan.id", loan_id)
        span.set_attribute("loan.type", borrower_data["loan_type"])
        span.set_attribute("loan.amount", borrower_data["requested_amount"])
        span.set_attribute("borrower.state", borrower_data["state"])

        # Store the application in the database
        application = create_application(borrower_data, loan_id)

        # Save the span context so downstream phases can link back
        store_span_context(loan_id, "application_submit", span.get_span_context())

        # Kick off the next phase asynchronously
        trigger_credit_pull(loan_id)

        return application
```

## Tracing the Credit Pull Phase

When the credit pull service picks up the work, it creates a new trace but links it back to the original application span.

```python
def perform_credit_pull(loan_id):
    """Pull credit reports from bureaus for the given loan."""
    # Retrieve the span context from the application phase
    parent_ctx = retrieve_span_context(loan_id, "application_submit")
    link = Link(parent_ctx) if parent_ctx else None

    links = [link] if link else []

    with tracer.start_as_current_span("loan.credit_pull", links=links) as span:
        span.set_attribute("loan.id", loan_id)

        # Pull from each credit bureau
        for bureau in ["equifax", "experian", "transunion"]:
            with tracer.start_as_current_span(f"loan.credit_pull.{bureau}") as bureau_span:
                report = call_credit_bureau(bureau, loan_id)
                bureau_span.set_attribute("credit.score", report.score)
                bureau_span.set_attribute("credit.bureau", bureau)
                bureau_span.set_attribute("credit.response_time_ms", report.response_time_ms)

        # Store this span context for the underwriting phase
        store_span_context(loan_id, "credit_pull", span.get_span_context())

        # Calculate a combined score and trigger underwriting
        combined_score = calculate_combined_score(loan_id)
        trigger_underwriting(loan_id, combined_score)
```

## Instrumenting the Underwriting Decision

Underwriting is where the real business logic lives. It may involve automated rules, manual review, or both. You want to capture which path was taken and how long each step required.

```python
def underwrite_loan(loan_id, credit_data):
    """Run the underwriting process for a loan application."""
    credit_pull_ctx = retrieve_span_context(loan_id, "credit_pull")
    links = [Link(credit_pull_ctx)] if credit_pull_ctx else []

    with tracer.start_as_current_span("loan.underwriting", links=links) as span:
        span.set_attribute("loan.id", loan_id)
        application = load_application(loan_id)

        # Step 1: Automated rules engine
        with tracer.start_as_current_span("loan.underwriting.rules_engine") as rules_span:
            rules_result = run_rules_engine(application, credit_data)
            rules_span.set_attribute("rules.decision", rules_result.decision)
            rules_span.set_attribute("rules.triggered_count", len(rules_result.triggered_rules))
            rules_span.set_attribute("rules.dti_ratio", rules_result.dti_ratio)

        # Step 2: If the rules engine says "refer", route to manual review
        if rules_result.decision == "refer":
            with tracer.start_as_current_span("loan.underwriting.manual_review") as manual_span:
                manual_span.set_attribute("underwriter.queue", "manual_review")
                # This span will be long-lived; we record it and close when the
                # underwriter makes their decision via a callback
                store_span_context(loan_id, "manual_review", manual_span.get_span_context())
                assign_to_underwriter(loan_id)
                # The span stays open until the underwriter submits their decision
                return "pending_manual_review"

        # Step 3: Auto-decision path
        with tracer.start_as_current_span("loan.underwriting.auto_decision") as decision_span:
            final_decision = make_auto_decision(rules_result)
            decision_span.set_attribute("decision.outcome", final_decision.outcome)
            decision_span.set_attribute("decision.rate_offered", final_decision.rate)

        store_span_context(loan_id, "underwriting", span.get_span_context())
        trigger_approval_workflow(loan_id, final_decision)
```

## Tracking Metrics Alongside Traces

In addition to traces, you should track key business metrics that give you an aggregate view of the pipeline.

```python
from opentelemetry import metrics

meter = metrics.get_meter("loan-origination")

# How long each phase takes
phase_duration = meter.create_histogram(
    name="loan.phase_duration_seconds",
    description="Duration of each loan origination phase",
    unit="s"
)

# Conversion rates at each stage
application_counter = meter.create_counter(
    name="loan.applications_total",
    description="Total loan applications by outcome at each stage"
)

# Track how many loans are currently in each phase
loans_in_phase = meter.create_up_down_counter(
    name="loan.in_phase",
    description="Number of loans currently in each phase"
)

def record_phase_completion(loan_id, phase, duration_s, outcome):
    """Record metrics when a loan moves from one phase to the next."""
    phase_duration.record(duration_s, attributes={
        "loan.phase": phase,
        "loan.outcome": outcome,
    })
    application_counter.add(1, attributes={
        "loan.phase": phase,
        "loan.outcome": outcome,
    })
    loans_in_phase.add(-1, attributes={"loan.phase": phase})
```

## Handling Long-Running Spans

One practical concern is that loan workflows can take days. You should not keep a span open for that long. Instead, create discrete spans for each phase and use span links to connect them. Store the span context (trace ID, span ID) in your database alongside the loan record. When the next phase starts, retrieve the context and create a link. This approach gives you a connected view of the loan journey without keeping resources tied up.

## Conclusion

Tracing loan origination workflows with OpenTelemetry requires thinking beyond request-scoped traces. By using span links, persisted span contexts, and phase-level metrics, you get full visibility into a process that spans multiple services and potentially multiple days. This makes it possible to identify bottlenecks, track SLAs for each phase, and quickly diagnose where a particular loan got stuck in the pipeline.
