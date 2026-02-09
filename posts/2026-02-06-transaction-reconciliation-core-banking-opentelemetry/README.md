# How to Monitor Real-Time Transaction Reconciliation Between Core Banking and Payment Processors with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Transaction Reconciliation, Core Banking, Payment Processing

Description: Monitor and trace real-time transaction reconciliation between core banking systems and payment processors using OpenTelemetry.

Transaction reconciliation is the backbone of financial operations. Every transaction that flows through a payment processor must be matched against the corresponding entry in the core banking system. When these records do not match, you have a reconciliation break that needs immediate attention. OpenTelemetry gives you the tools to monitor this process in real time, catch discrepancies early, and trace the root cause when things go wrong.

## The Reconciliation Challenge

A typical bank processes millions of transactions daily through multiple payment processors (Visa, Mastercard, ACH networks, wire transfer systems). Each processor has its own format, timing, and settlement schedule. The reconciliation engine must match transactions from these external sources against the bank's internal ledger, flagging any discrepancies in amount, status, or timing.

## Setting Up Metrics for Reconciliation Monitoring

We start with OpenTelemetry metrics to track the health of the reconciliation process.

```python
# recon_metrics.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

def setup_recon_metrics():
    reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint="otel-collector:4317"),
        export_interval_millis=10000  # Export every 10 seconds
    )
    provider = MeterProvider(metric_readers=[reader])
    metrics.set_meter_provider(provider)

    meter = metrics.get_meter("reconciliation.engine")

    return {
        # Count of transactions processed by reconciliation
        "txn_processed": meter.create_counter(
            "recon.transactions.processed",
            description="Total transactions processed by reconciliation",
            unit="transactions"
        ),
        # Count of matched vs unmatched transactions
        "txn_matched": meter.create_counter(
            "recon.transactions.matched",
            description="Transactions successfully matched"
        ),
        "txn_unmatched": meter.create_counter(
            "recon.transactions.unmatched",
            description="Transactions that could not be matched"
        ),
        # Amount discrepancies found
        "amount_discrepancy": meter.create_histogram(
            "recon.discrepancy.amount",
            description="Amount discrepancies found during reconciliation",
            unit="cents"
        ),
        # Time lag between transaction and reconciliation
        "recon_lag": meter.create_histogram(
            "recon.lag.seconds",
            description="Seconds between transaction time and reconciliation",
            unit="seconds"
        ),
        # Current unreconciled transaction count (gauge)
        "unreconciled_count": meter.create_up_down_counter(
            "recon.unreconciled.count",
            description="Current count of unreconciled transactions"
        ),
    }
```

## The Reconciliation Engine with Tracing

Now let's build the reconciliation engine with full tracing support.

```python
# recon_engine.py
from opentelemetry import trace
from datetime import datetime, timedelta
import time

tracer = trace.get_tracer("reconciliation.engine")

class ReconciliationEngine:
    def __init__(self, core_banking, payment_processor, recon_metrics):
        self.core = core_banking
        self.processor = payment_processor
        self.metrics = recon_metrics

    def reconcile_batch(self, processor_name: str, batch_id: str):
        """Reconcile a batch of transactions from a payment processor."""
        with tracer.start_as_current_span("recon.batch") as span:
            span.set_attribute("recon.processor", processor_name)
            span.set_attribute("recon.batch_id", batch_id)

            # Fetch transactions from payment processor
            with tracer.start_as_current_span("recon.fetch_processor_txns") as fetch_span:
                processor_txns = self.processor.get_batch(batch_id)
                fetch_span.set_attribute("recon.processor_txn_count", len(processor_txns))

            # Fetch corresponding transactions from core banking
            with tracer.start_as_current_span("recon.fetch_core_txns") as fetch_span:
                # Get the time range from the processor batch
                start_time = min(t.timestamp for t in processor_txns)
                end_time = max(t.timestamp for t in processor_txns)
                core_txns = self.core.get_transactions(
                    start=start_time,
                    end=end_time + timedelta(hours=1),
                    processor=processor_name
                )
                fetch_span.set_attribute("recon.core_txn_count", len(core_txns))

            # Build index of core transactions for fast lookup
            core_index = {t.reference_id: t for t in core_txns}

            matched = 0
            unmatched = 0
            discrepancies = []

            # Match each processor transaction against core banking
            for ptxn in processor_txns:
                result = self._reconcile_single(ptxn, core_index, processor_name)
                if result.matched:
                    matched += 1
                else:
                    unmatched += 1
                    if result.discrepancy:
                        discrepancies.append(result.discrepancy)

            # Record summary metrics
            span.set_attribute("recon.matched_count", matched)
            span.set_attribute("recon.unmatched_count", unmatched)
            span.set_attribute("recon.discrepancy_count", len(discrepancies))

            self.metrics["txn_matched"].add(matched, {"processor": processor_name})
            self.metrics["txn_unmatched"].add(unmatched, {"processor": processor_name})

            if unmatched > 0:
                span.set_status(trace.StatusCode.ERROR,
                    f"{unmatched} unmatched transactions in batch")

            return ReconciliationResult(matched, unmatched, discrepancies)

    def _reconcile_single(self, processor_txn, core_index, processor_name):
        """Reconcile a single transaction."""
        with tracer.start_as_current_span("recon.single") as span:
            span.set_attribute("recon.processor_ref", processor_txn.reference_id)
            span.set_attribute("recon.processor_amount", processor_txn.amount)

            self.metrics["txn_processed"].add(1, {"processor": processor_name})

            # Try to find matching core banking transaction
            core_txn = core_index.get(processor_txn.reference_id)

            if core_txn is None:
                span.set_attribute("recon.match_status", "not_found")
                span.set_status(trace.StatusCode.ERROR, "No matching core transaction")
                self.metrics["unreconciled_count"].add(1, {"processor": processor_name})
                return MatchResult(matched=False, discrepancy="missing_in_core")

            # Check amount match
            if abs(core_txn.amount - processor_txn.amount) > 0.01:
                amount_diff = abs(core_txn.amount - processor_txn.amount)
                span.set_attribute("recon.match_status", "amount_mismatch")
                span.set_attribute("recon.core_amount", core_txn.amount)
                span.set_attribute("recon.amount_difference", amount_diff)

                # Record the discrepancy amount in the histogram
                self.metrics["amount_discrepancy"].record(
                    int(amount_diff * 100),  # Convert to cents
                    {"processor": processor_name}
                )
                return MatchResult(matched=False, discrepancy="amount_mismatch")

            # Check status match
            if core_txn.status != processor_txn.expected_status:
                span.set_attribute("recon.match_status", "status_mismatch")
                span.set_attribute("recon.core_status", core_txn.status)
                span.set_attribute("recon.expected_status", processor_txn.expected_status)
                return MatchResult(matched=False, discrepancy="status_mismatch")

            # Record reconciliation lag
            lag = (datetime.utcnow() - processor_txn.timestamp).total_seconds()
            self.metrics["recon_lag"].record(lag, {"processor": processor_name})

            span.set_attribute("recon.match_status", "matched")
            span.set_attribute("recon.lag_seconds", lag)
            return MatchResult(matched=True)
```

## Running Reconciliation on a Schedule

The reconciliation engine runs continuously, processing batches from each payment processor.

```python
# recon_scheduler.py
import schedule
import time

def run_reconciliation():
    processors = ["visa", "mastercard", "ach_network", "wire_transfer"]

    for processor_name in processors:
        with tracer.start_as_current_span("recon.scheduled_run") as span:
            span.set_attribute("recon.processor", processor_name)

            # Get unreconciled batches
            batches = get_pending_batches(processor_name)
            span.set_attribute("recon.pending_batches", len(batches))

            for batch in batches:
                engine.reconcile_batch(processor_name, batch.id)

# Run every 30 seconds for near real-time reconciliation
schedule.every(30).seconds.do(run_reconciliation)
```

## Alerting on Reconciliation Issues

With the metrics flowing into your OpenTelemetry collector, you can set up alerts for situations that need attention. Watch for spikes in `recon.transactions.unmatched`, high values in `recon.discrepancy.amount`, or `recon.lag.seconds` exceeding your SLA threshold. The trace data lets you drill into any specific reconciliation failure to understand exactly which transaction failed to match and why.

When an alert fires, the trace data shows you the full context: which processor batch triggered it, what the specific discrepancy was, and the timing of each step. This turns what used to be hours of manual investigation into minutes of trace analysis.
