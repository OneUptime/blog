# How to Trace Risk Calculation Pipelines (Credit Scoring, Market Risk, Liquidity Risk) with OpenTelemetry Span Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Risk Management, Credit Scoring, Span Attributes

Description: Trace credit scoring, market risk, and liquidity risk calculation pipelines with rich OpenTelemetry span attributes for full visibility.

Risk calculation pipelines in financial institutions are complex, multi-stage processes that pull data from dozens of sources, apply mathematical models, and produce scores that drive lending decisions, trading limits, and regulatory reporting. When a risk calculation takes too long or produces unexpected results, you need to trace through every stage of the pipeline to understand what happened. OpenTelemetry span attributes let you capture the rich context that makes these traces useful.

## Why Span Attributes Matter for Risk Pipelines

A trace without attributes tells you that a span took 500ms. A trace with well-designed attributes tells you that a credit scoring calculation took 500ms because the bureau data pull for a customer with 12 trade lines and 3 inquiries returned a thin-file response that triggered a secondary model evaluation. That context is the difference between knowing something is slow and knowing why it is slow.

## Tracing a Credit Scoring Pipeline

Let's instrument a credit scoring pipeline that pulls bureau data, applies scoring models, and produces a decision.

```python
# credit_scoring.py
from opentelemetry import trace

tracer = trace.get_tracer("risk.credit.scoring")

def calculate_credit_score(application):
    with tracer.start_as_current_span("credit.score.calculate") as span:
        # Tag the span with application-level attributes
        span.set_attribute("risk.application_id", application.id)
        span.set_attribute("risk.product_type", application.product_type)
        span.set_attribute("risk.requested_amount", float(application.amount))

        # Stage 1: Pull credit bureau data
        with tracer.start_as_current_span("credit.bureau.pull") as bureau_span:
            bureau_data = credit_bureau.pull(application.ssn_hash)
            bureau_span.set_attribute("risk.bureau.provider", bureau_data.provider)
            bureau_span.set_attribute("risk.bureau.trade_line_count", bureau_data.trade_line_count)
            bureau_span.set_attribute("risk.bureau.inquiry_count", bureau_data.inquiry_count)
            bureau_span.set_attribute("risk.bureau.oldest_account_months", bureau_data.oldest_account_months)
            bureau_span.set_attribute("risk.bureau.utilization_pct", bureau_data.utilization)
            bureau_span.set_attribute("risk.bureau.derogatory_count", bureau_data.derogatory_count)
            bureau_span.set_attribute("risk.bureau.thin_file", bureau_data.trade_line_count < 3)

        # Stage 2: Select and run the appropriate scoring model
        with tracer.start_as_current_span("credit.model.select") as model_span:
            model = select_scoring_model(application, bureau_data)
            model_span.set_attribute("risk.model.name", model.name)
            model_span.set_attribute("risk.model.version", model.version)
            model_span.set_attribute("risk.model.type", model.model_type)

        with tracer.start_as_current_span("credit.model.execute") as exec_span:
            score_result = model.score(application, bureau_data)
            exec_span.set_attribute("risk.score.value", score_result.score)
            exec_span.set_attribute("risk.score.band", score_result.band)
            exec_span.set_attribute("risk.score.factors", str(score_result.top_factors))
            exec_span.set_attribute("risk.score.model_confidence", score_result.confidence)

        # Stage 3: Apply policy rules
        with tracer.start_as_current_span("credit.policy.evaluate") as policy_span:
            decision = policy_engine.evaluate(score_result, application)
            policy_span.set_attribute("risk.decision", decision.outcome)
            policy_span.set_attribute("risk.decision.reason_codes", str(decision.reason_codes))
            policy_span.set_attribute("risk.decision.approved_amount", float(decision.approved_amount))
            policy_span.set_attribute("risk.decision.rate_tier", decision.rate_tier)
            policy_span.set_attribute("risk.policy.rules_evaluated", decision.rules_evaluated)
            policy_span.set_attribute("risk.policy.rules_triggered", decision.rules_triggered)

        span.set_attribute("risk.final_decision", decision.outcome)
        return decision
```

## Tracing Market Risk Calculations

Market risk pipelines compute Value at Risk (VaR), stress test results, and Greeks for trading portfolios. These calculations are computationally intensive and often involve Monte Carlo simulations.

```python
# market_risk.py
tracer = trace.get_tracer("risk.market")

def calculate_portfolio_var(portfolio, params):
    with tracer.start_as_current_span("market_risk.var.calculate") as span:
        span.set_attribute("risk.portfolio_id", portfolio.id)
        span.set_attribute("risk.portfolio.position_count", len(portfolio.positions))
        span.set_attribute("risk.var.confidence_level", params.confidence)
        span.set_attribute("risk.var.horizon_days", params.horizon)
        span.set_attribute("risk.var.method", params.method)

        # Stage 1: Load market data
        with tracer.start_as_current_span("market_risk.load_market_data") as md_span:
            market_data = market_data_service.get_current(
                instruments=[p.instrument for p in portfolio.positions]
            )
            md_span.set_attribute("risk.market_data.instrument_count", len(market_data))
            md_span.set_attribute("risk.market_data.as_of", str(market_data.as_of_date))
            md_span.set_attribute("risk.market_data.stale_count",
                sum(1 for m in market_data if m.is_stale))

        # Stage 2: Load historical scenarios or run simulation
        if params.method == "historical":
            with tracer.start_as_current_span("market_risk.historical_scenarios") as hist_span:
                scenarios = scenario_service.get_historical(
                    lookback_days=params.lookback
                )
                hist_span.set_attribute("risk.scenarios.count", len(scenarios))
                hist_span.set_attribute("risk.scenarios.lookback_days", params.lookback)

        elif params.method == "monte_carlo":
            with tracer.start_as_current_span("market_risk.monte_carlo") as mc_span:
                scenarios = monte_carlo.simulate(
                    market_data=market_data,
                    num_simulations=params.num_simulations,
                    horizon=params.horizon
                )
                mc_span.set_attribute("risk.monte_carlo.simulations", params.num_simulations)
                mc_span.set_attribute("risk.monte_carlo.convergence", scenarios.convergence_metric)

        # Stage 3: Compute P&L distribution
        with tracer.start_as_current_span("market_risk.compute_pnl") as pnl_span:
            pnl_distribution = var_engine.compute_pnl(portfolio, scenarios, market_data)
            pnl_span.set_attribute("risk.pnl.mean", float(pnl_distribution.mean))
            pnl_span.set_attribute("risk.pnl.std_dev", float(pnl_distribution.std))
            pnl_span.set_attribute("risk.pnl.skewness", float(pnl_distribution.skewness))

        # Stage 4: Extract VaR
        var_value = pnl_distribution.percentile(1 - params.confidence)
        span.set_attribute("risk.var.value", float(var_value))
        span.set_attribute("risk.var.as_pct_of_nav", float(var_value / portfolio.nav))

        return VaRResult(value=var_value, distribution=pnl_distribution)
```

## Tracing Liquidity Risk Assessment

Liquidity risk pipelines assess whether an institution can meet its cash flow obligations. These involve aggregating positions, modeling cash flows, and computing coverage ratios.

```python
# liquidity_risk.py
tracer = trace.get_tracer("risk.liquidity")

def assess_liquidity_coverage(entity_id: str, horizon_days: int):
    with tracer.start_as_current_span("liquidity_risk.lcr.calculate") as span:
        span.set_attribute("risk.entity_id", entity_id)
        span.set_attribute("risk.lcr.horizon_days", horizon_days)

        # Compute High Quality Liquid Assets (HQLA)
        with tracer.start_as_current_span("liquidity_risk.compute_hqla") as hqla_span:
            hqla = hqla_service.compute(entity_id)
            hqla_span.set_attribute("risk.hqla.level1", float(hqla.level1))
            hqla_span.set_attribute("risk.hqla.level2a", float(hqla.level2a))
            hqla_span.set_attribute("risk.hqla.level2b", float(hqla.level2b))
            hqla_span.set_attribute("risk.hqla.total", float(hqla.total))
            hqla_span.set_attribute("risk.hqla.asset_count", hqla.asset_count)

        # Compute net cash outflows under stress
        with tracer.start_as_current_span("liquidity_risk.compute_outflows") as out_span:
            outflows = cash_flow_service.compute_stressed_outflows(
                entity_id, horizon_days
            )
            out_span.set_attribute("risk.outflows.gross", float(outflows.gross))
            out_span.set_attribute("risk.outflows.inflows_cap", float(outflows.inflows_cap))
            out_span.set_attribute("risk.outflows.net", float(outflows.net))
            out_span.set_attribute("risk.outflows.counterparty_count", outflows.counterparty_count)

        # Compute the Liquidity Coverage Ratio
        lcr = hqla.total / outflows.net if outflows.net > 0 else float('inf')
        span.set_attribute("risk.lcr.ratio", float(lcr))
        span.set_attribute("risk.lcr.meets_minimum", lcr >= 1.0)
        span.set_attribute("risk.lcr.regulatory_minimum", 1.0)

        if lcr < 1.0:
            span.set_status(trace.StatusCode.ERROR,
                f"LCR {lcr:.2f} below regulatory minimum of 1.0")

        return LCRResult(ratio=lcr, hqla=hqla, outflows=outflows)
```

## Querying Traces by Risk Attributes

The real power of detailed span attributes shows up when you query your trace backend. You can find all credit decisions where `risk.bureau.thin_file` was true and `risk.score.model_confidence` was below 0.7. You can identify all VaR calculations where `risk.market_data.stale_count` was greater than zero, which might indicate data feed issues affecting risk numbers. You can track all liquidity assessments where the LCR dropped below the regulatory threshold.

These queries transform your trace data from a debugging tool into a risk analytics platform. By investing in rich, consistent span attributes across all three risk domains, you build a foundation that serves both engineering and risk management teams.
