# How to Trace Wealth Management Portfolio Rebalancing Calculations with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Wealth Management, Portfolio Rebalancing, Distributed Tracing

Description: Use OpenTelemetry to trace portfolio rebalancing calculations in wealth management platforms and identify performance bottlenecks.

Portfolio rebalancing is a core function of any wealth management platform. When a client's portfolio drifts from their target allocation, the system must calculate the optimal set of trades to bring it back in line, taking into account tax implications, transaction costs, and constraints like minimum lot sizes. For platforms managing thousands of accounts, this calculation can be computationally expensive. This post shows how to instrument the rebalancing pipeline with OpenTelemetry to trace each step and identify where time is being spent.

## The Rebalancing Workflow

A typical rebalancing run involves these steps:

1. **Drift detection** - identify portfolios that have drifted beyond their threshold
2. **Target calculation** - determine the ideal allocation based on the client's model
3. **Tax lot analysis** - evaluate capital gains implications of each potential trade
4. **Trade generation** - produce the set of buy/sell orders that minimizes cost while achieving the target
5. **Compliance check** - verify that proposed trades do not violate any restrictions
6. **Order submission** - send orders to the execution management system

## Instrumentation Setup

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

trace_provider = TracerProvider()
trace_provider.add_span_processor(
    BatchSpanExporter(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(trace_provider)

reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317")
)
meter_provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(meter_provider)

tracer = trace.get_tracer("portfolio-rebalancing")
meter = metrics.get_meter("portfolio-rebalancing")
```

## Tracing the Drift Detection Phase

Drift detection scans all managed accounts and flags those that need rebalancing. This is typically run on a schedule.

```python
import time

# Metrics for the rebalancing pipeline
drift_scan_duration = meter.create_histogram(
    name="rebalancing.drift_scan_duration_seconds",
    description="Time to scan all portfolios for drift",
    unit="s"
)

portfolios_drifted = meter.create_counter(
    name="rebalancing.portfolios_drifted_total",
    description="Number of portfolios that exceeded drift threshold"
)

rebalance_duration = meter.create_histogram(
    name="rebalancing.calculation_duration_ms",
    description="Time to calculate rebalancing trades for a single portfolio",
    unit="ms"
)

def scan_for_drift(account_ids):
    """Scan accounts for allocation drift and return those needing rebalancing."""
    with tracer.start_as_current_span("rebalancing.drift_scan") as span:
        start = time.monotonic()
        drifted_accounts = []

        span.set_attribute("scan.total_accounts", len(account_ids))

        for account_id in account_ids:
            current_allocation = get_current_allocation(account_id)
            target_allocation = get_target_allocation(account_id)
            max_drift = calculate_max_drift(current_allocation, target_allocation)

            threshold = get_drift_threshold(account_id)
            if max_drift > threshold:
                drifted_accounts.append({
                    "account_id": account_id,
                    "max_drift": max_drift,
                    "threshold": threshold,
                })
                portfolios_drifted.add(1, {
                    "model": target_allocation.model_name,
                })

        elapsed = time.monotonic() - start
        drift_scan_duration.record(elapsed)
        span.set_attribute("scan.drifted_count", len(drifted_accounts))
        span.set_attribute("scan.duration_s", elapsed)

        return drifted_accounts
```

## Tracing the Rebalancing Calculation

This is the computationally intensive part. For each portfolio, we need to figure out the optimal trades.

```python
def rebalance_portfolio(account_id):
    """Calculate rebalancing trades for a single portfolio."""
    with tracer.start_as_current_span("rebalancing.calculate") as span:
        calc_start = time.monotonic()
        span.set_attribute("account.id", account_id)

        # Step 1: Load current holdings and target model
        with tracer.start_as_current_span("rebalancing.load_data") as load_span:
            holdings = load_holdings(account_id)
            model = load_target_model(account_id)
            restrictions = load_account_restrictions(account_id)
            load_span.set_attribute("holdings.count", len(holdings))
            load_span.set_attribute("model.name", model.name)
            load_span.set_attribute("restrictions.count", len(restrictions))

        # Step 2: Calculate target positions
        with tracer.start_as_current_span("rebalancing.target_calc") as target_span:
            portfolio_value = sum(h.market_value for h in holdings)
            target_positions = calculate_target_positions(model, portfolio_value)
            target_span.set_attribute("portfolio.value", portfolio_value)
            target_span.set_attribute("target.positions_count", len(target_positions))

        # Step 3: Tax lot analysis for sell candidates
        with tracer.start_as_current_span("rebalancing.tax_analysis") as tax_span:
            tax_lots = load_tax_lots(account_id)
            tax_impact = analyze_tax_impact(holdings, target_positions, tax_lots)
            tax_span.set_attribute("tax.lots_analyzed", len(tax_lots))
            tax_span.set_attribute("tax.estimated_gain", tax_impact.total_gain)
            tax_span.set_attribute("tax.estimated_loss", tax_impact.total_loss)
            tax_span.set_attribute("tax.wash_sale_risk_count",
                                  tax_impact.wash_sale_risks)

        # Step 4: Generate trades with tax optimization
        with tracer.start_as_current_span("rebalancing.trade_generation") as trade_span:
            proposed_trades = generate_optimal_trades(
                holdings=holdings,
                targets=target_positions,
                tax_impact=tax_impact,
                restrictions=restrictions
            )
            trade_span.set_attribute("trades.count", len(proposed_trades))
            trade_span.set_attribute("trades.buy_count",
                                    sum(1 for t in proposed_trades if t.side == "buy"))
            trade_span.set_attribute("trades.sell_count",
                                    sum(1 for t in proposed_trades if t.side == "sell"))
            trade_span.set_attribute("trades.total_turnover",
                                    sum(abs(t.notional) for t in proposed_trades))

        # Step 5: Compliance pre-check
        with tracer.start_as_current_span("rebalancing.compliance_check") as comp_span:
            compliance_result = check_trade_compliance(proposed_trades, account_id)
            comp_span.set_attribute("compliance.passed", compliance_result.passed)
            comp_span.set_attribute("compliance.violations", len(compliance_result.violations))

            if not compliance_result.passed:
                # Adjust trades to fix compliance issues
                proposed_trades = adjust_for_compliance(
                    proposed_trades, compliance_result.violations
                )
                comp_span.set_attribute("compliance.trades_adjusted", True)

        calc_elapsed_ms = (time.monotonic() - calc_start) * 1000
        rebalance_duration.record(calc_elapsed_ms, {
            "model": model.name,
        })

        span.set_attribute("calculation.duration_ms", calc_elapsed_ms)
        return proposed_trades
```

## Batch Rebalancing with Per-Account Tracing

When rebalancing runs across many accounts, you want both the overall batch trace and per-account detail.

```python
batch_duration = meter.create_histogram(
    name="rebalancing.batch_duration_seconds",
    description="Total time for a batch rebalancing run",
    unit="s"
)

batch_account_count = meter.create_counter(
    name="rebalancing.batch_accounts_total",
    description="Accounts processed in batch rebalancing by outcome"
)

def run_batch_rebalancing():
    """Run rebalancing across all accounts that need it."""
    with tracer.start_as_current_span("rebalancing.batch_run") as batch_span:
        batch_start = time.monotonic()

        # Find all accounts needing rebalancing
        all_accounts = get_all_managed_accounts()
        drifted = scan_for_drift(all_accounts)
        batch_span.set_attribute("batch.total_accounts", len(all_accounts))
        batch_span.set_attribute("batch.drifted_accounts", len(drifted))

        results = {"success": 0, "failed": 0, "skipped": 0}

        for account_info in drifted:
            account_id = account_info["account_id"]
            try:
                trades = rebalance_portfolio(account_id)
                if trades:
                    submit_trades(trades, account_id)
                    results["success"] += 1
                    batch_account_count.add(1, {"outcome": "success"})
                else:
                    results["skipped"] += 1
                    batch_account_count.add(1, {"outcome": "skipped"})
            except Exception as e:
                results["failed"] += 1
                batch_account_count.add(1, {"outcome": "failed"})

        batch_elapsed = time.monotonic() - batch_start
        batch_duration.record(batch_elapsed)
        batch_span.set_attribute("batch.duration_s", batch_elapsed)
        batch_span.set_attribute("batch.results", str(results))

        return results
```

## What to Watch For

Key things to monitor in your rebalancing pipeline:

- **Tax lot analysis duration** is often the slowest step, especially for accounts with years of transaction history. If it is consistently slow, you might need to pre-compute tax lot data.
- **Compliance check failures** that require trade adjustment can add significant time. Track how often this happens per model.
- **Batch completion time** relative to your processing window. If rebalancing is scheduled overnight, you need it to finish before markets open.

## Conclusion

Portfolio rebalancing involves complex calculations with real financial impact. By tracing each phase with OpenTelemetry, you can identify which steps are slow, understand the distribution of processing times across accounts, and ensure your rebalancing runs complete within their operational windows. The per-account traces also provide valuable audit data showing exactly what was calculated and why each trade was proposed.
