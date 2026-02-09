# How to Trace Demand Forecasting and Inventory Replenishment Pipelines with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Demand Forecasting, Inventory Management, Supply Chain

Description: Trace demand forecasting models and inventory replenishment pipelines with OpenTelemetry to debug prediction errors and stock issues.

Demand forecasting predicts how much of each product you will sell, and inventory replenishment uses those forecasts to decide what to order and when. When the forecast is wrong, you either run out of stock and lose sales or overstock and tie up capital. The tricky part is that these pipelines involve multiple data sources, ML models, and business rules. OpenTelemetry tracing lets you follow the data through each step so you can figure out why a forecast went sideways.

## Tracer Setup

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("demand.forecasting")
meter = metrics.get_meter("demand.forecasting")
```

## Tracing the Forecasting Pipeline

A typical demand forecasting pipeline pulls historical sales data, enriches it with external signals (seasonality, promotions, weather), runs an ML model, and outputs predicted demand per SKU.

```python
def run_demand_forecast(sku: str, forecast_horizon_days: int):
    with tracer.start_as_current_span("forecast.run") as span:
        span.set_attribute("sku", sku)
        span.set_attribute("forecast.horizon_days", forecast_horizon_days)

        # Step 1: Pull historical sales data
        with tracer.start_as_current_span("forecast.fetch_sales_history") as hist_span:
            sales_history = fetch_sales_data(sku, lookback_days=365)
            hist_span.set_attribute("history.data_points", len(sales_history))
            hist_span.set_attribute("history.lookback_days", 365)
            hist_span.set_attribute("history.source", "data_warehouse")

            if len(sales_history) < 30:
                hist_span.add_event("insufficient_history", {
                    "data_points": len(sales_history),
                    "minimum_required": 30
                })

        # Step 2: Fetch external signals
        with tracer.start_as_current_span("forecast.fetch_external_signals") as signals_span:
            signals = {}

            # Promotion calendar
            with tracer.start_as_current_span("forecast.fetch_promotions"):
                promotions = fetch_upcoming_promotions(sku)
                signals["promotions"] = promotions

            # Seasonal patterns
            with tracer.start_as_current_span("forecast.fetch_seasonality"):
                seasonality = fetch_seasonality_index(sku)
                signals["seasonality"] = seasonality

            # Weather forecast for weather-sensitive products
            with tracer.start_as_current_span("forecast.fetch_weather"):
                weather = fetch_weather_forecast(forecast_horizon_days)
                signals["weather"] = weather

            signals_span.set_attribute("signals.promotion_count", len(promotions))
            signals_span.set_attribute("signals.seasonality_index", seasonality.current_index)

        # Step 3: Build features and run the model
        with tracer.start_as_current_span("forecast.ml_inference") as model_span:
            features = build_forecast_features(sales_history, signals)
            model_span.set_attribute("model.feature_count", len(features))
            model_span.set_attribute("model.name", "xgboost_demand_v2")

            prediction = run_forecast_model(features, forecast_horizon_days)
            model_span.set_attribute("model.predicted_daily_demand", prediction.daily_demand)
            model_span.set_attribute("model.confidence_interval_lower", prediction.ci_lower)
            model_span.set_attribute("model.confidence_interval_upper", prediction.ci_upper)
            model_span.set_attribute("model.total_predicted_units", prediction.total_units)

        span.set_attribute("forecast.predicted_units", prediction.total_units)
        return prediction
```

## Tracing Inventory Replenishment Decisions

The replenishment engine takes the demand forecast, compares it against current inventory levels and supplier lead times, and generates purchase orders.

```python
def calculate_replenishment(sku: str, forecast: object):
    with tracer.start_as_current_span("replenishment.calculate") as span:
        span.set_attribute("sku", sku)
        span.set_attribute("forecast.daily_demand", forecast.daily_demand)

        # Check current inventory position
        with tracer.start_as_current_span("replenishment.check_inventory") as inv_span:
            inventory = get_inventory_position(sku)
            inv_span.set_attribute("inventory.on_hand", inventory.on_hand)
            inv_span.set_attribute("inventory.in_transit", inventory.in_transit)
            inv_span.set_attribute("inventory.committed", inventory.committed)
            inv_span.set_attribute("inventory.available", inventory.available)

        # Get supplier lead time
        with tracer.start_as_current_span("replenishment.get_lead_time") as lead_span:
            supplier = get_primary_supplier(sku)
            lead_span.set_attribute("supplier.name", supplier.name)
            lead_span.set_attribute("supplier.lead_time_days", supplier.lead_time_days)
            lead_span.set_attribute("supplier.reliability_pct", supplier.reliability_score)

        # Calculate safety stock and reorder point
        with tracer.start_as_current_span("replenishment.compute_reorder") as reorder_span:
            safety_stock = compute_safety_stock(
                forecast.daily_demand, supplier.lead_time_days,
                forecast.ci_upper, supplier.reliability_score
            )
            reorder_point = (forecast.daily_demand * supplier.lead_time_days) + safety_stock
            order_quantity = compute_economic_order_quantity(sku, forecast.daily_demand)

            reorder_span.set_attribute("reorder.safety_stock", safety_stock)
            reorder_span.set_attribute("reorder.reorder_point", reorder_point)
            reorder_span.set_attribute("reorder.eoq", order_quantity)
            reorder_span.set_attribute("reorder.should_order",
                                        inventory.available < reorder_point)

        # Generate PO if needed
        if inventory.available < reorder_point:
            with tracer.start_as_current_span("replenishment.create_po") as po_span:
                po = create_purchase_order(sku, supplier, order_quantity)
                po_span.set_attribute("po.number", po.po_number)
                po_span.set_attribute("po.quantity", order_quantity)
                po_span.set_attribute("po.expected_delivery", po.expected_delivery.isoformat())
                span.set_attribute("replenishment.po_created", True)
        else:
            span.set_attribute("replenishment.po_created", False)
```

## Tracking Forecast Accuracy

You need to compare predictions against actual sales to measure model performance over time.

```python
forecast_error = meter.create_histogram(
    "forecast.error_pct",
    description="Percentage error between forecasted and actual demand",
    unit="pct"
)

stockout_counter = meter.create_counter(
    "inventory.stockouts",
    description="Number of stockout events"
)

overstock_counter = meter.create_counter(
    "inventory.overstock_events",
    description="Inventory exceeding max threshold"
)

def evaluate_forecast_accuracy(sku: str, predicted: float, actual: float):
    with tracer.start_as_current_span("forecast.evaluate") as span:
        span.set_attribute("sku", sku)
        span.set_attribute("forecast.predicted", predicted)
        span.set_attribute("forecast.actual", actual)

        error_pct = abs(predicted - actual) / max(actual, 1) * 100
        span.set_attribute("forecast.error_pct", round(error_pct, 2))

        forecast_error.record(error_pct, {"sku": sku, "model": "xgboost_demand_v2"})

        if error_pct > 30:
            span.add_event("high_forecast_error", {
                "predicted": predicted,
                "actual": actual,
                "error_pct": error_pct
            })
```

## What You Learn from the Traces

When a product stocks out unexpectedly, you can pull the forecast trace and see exactly what happened. Maybe the sales history had a data gap. Maybe the promotions signal was missing because the marketing team did not update the calendar. Maybe the model was fine but the supplier lead time was longer than expected. Each of these failure modes shows up as a distinct pattern in the trace. That is far more useful than staring at a spreadsheet of forecast numbers trying to guess what went wrong.
