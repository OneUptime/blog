# How to Trace Multi-Currency Pricing and Tax Calculation Services with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Multi-Currency, Tax Calculation, Pricing

Description: Trace multi-currency pricing conversions and tax calculations across distributed e-commerce services using OpenTelemetry spans and attributes.

Selling internationally means your pricing pipeline gets complicated fast. A single "show me the price" request might involve fetching the base price in USD, converting to the customer's local currency using a real-time exchange rate, applying region-specific taxes, adding duties for cross-border shipments, and formatting the result. Each step introduces latency and potential errors. OpenTelemetry tracing makes this pipeline transparent so you can spot which step is slowing things down or producing wrong results.

## The Pricing Pipeline Architecture

A typical multi-currency pricing request flows through several services:

1. Product catalog returns the base price
2. Currency service converts to the target currency
3. Tax service calculates applicable taxes
4. Duty/tariff service handles cross-border fees
5. Price formatter returns the final display price

Let's instrument each step.

## Instrumenting the Currency Conversion

The currency conversion service is latency-sensitive because exchange rates change frequently and you often need to call an external provider.

```python
from opentelemetry import trace, metrics
import time

tracer = trace.get_tracer("pricing.service")
meter = metrics.get_meter("pricing.service")

# Track conversion accuracy and performance
conversion_duration = meter.create_histogram(
    "currency.conversion.duration",
    unit="ms",
    description="Time to convert between currencies"
)

rate_staleness = meter.create_histogram(
    "currency.rate.staleness",
    unit="s",
    description="Age of the exchange rate used"
)

class CurrencyService:
    def __init__(self, rate_cache):
        self.rate_cache = rate_cache

    def convert(self, amount: float, from_currency: str, to_currency: str):
        with tracer.start_as_current_span("currency.convert") as span:
            span.set_attribute("currency.from", from_currency)
            span.set_attribute("currency.to", to_currency)
            span.set_attribute("currency.amount", amount)

            # Get the exchange rate (from cache or external API)
            rate, rate_age = self._get_rate(from_currency, to_currency)

            span.set_attribute("currency.rate", rate)
            span.set_attribute("currency.rate_age_seconds", rate_age)
            span.set_attribute("currency.rate_source",
                             "cache" if rate_age < 300 else "api")

            rate_staleness.record(rate_age, {
                "currency.pair": f"{from_currency}_{to_currency}"
            })

            converted = round(amount * rate, 2)
            span.set_attribute("currency.converted_amount", converted)

            return converted, rate

    def _get_rate(self, from_curr: str, to_curr: str):
        """Fetch rate from cache, falling back to external API."""
        with tracer.start_as_current_span("currency.get_rate") as span:
            pair = f"{from_curr}_{to_curr}"
            cached = self.rate_cache.get(pair)

            if cached and cached["age"] < 300:  # 5-minute cache
                span.set_attribute("cache.hit", True)
                return cached["rate"], cached["age"]

            span.set_attribute("cache.hit", False)
            start = time.time()
            rate = self._fetch_from_provider(from_curr, to_curr)
            duration = (time.time() - start) * 1000

            conversion_duration.record(duration, {
                "currency.pair": pair,
                "rate.source": "api"
            })

            self.rate_cache.set(pair, {"rate": rate, "age": 0})
            return rate, 0
```

## Instrumenting Tax Calculation

Tax calculation is where things get really complex. Different countries, states, and even cities have different tax rules. Your spans should capture enough detail to debug incorrect tax amounts.

```python
class TaxService:
    def calculate_tax(self, items: list, shipping_address: dict, currency: str):
        with tracer.start_as_current_span("tax.calculate") as span:
            country = shipping_address["country"]
            region = shipping_address.get("state", shipping_address.get("province", ""))

            span.set_attribute("tax.country", country)
            span.set_attribute("tax.region", region)
            span.set_attribute("tax.currency", currency)
            span.set_attribute("tax.item_count", len(items))

            # Determine which tax rules apply
            tax_rules = self._resolve_tax_rules(country, region)
            span.set_attribute("tax.rules_applied", len(tax_rules))

            total_tax = 0.0
            tax_breakdown = []

            for item in items:
                with tracer.start_as_current_span("tax.calculate_item") as item_span:
                    item_span.set_attribute("product.id", item["product_id"])
                    item_span.set_attribute("product.category", item["category"])
                    item_span.set_attribute("product.price", item["price"])

                    item_tax = 0.0
                    for rule in tax_rules:
                        if rule.applies_to(item["category"]):
                            tax_amount = item["price"] * item["quantity"] * rule.rate
                            item_tax += tax_amount
                            tax_breakdown.append({
                                "rule": rule.name,
                                "rate": rule.rate,
                                "amount": tax_amount
                            })

                    item_span.set_attribute("tax.item_total", round(item_tax, 2))
                    total_tax += item_tax

            span.set_attribute("tax.total", round(total_tax, 2))
            span.set_attribute("tax.effective_rate",
                             round(total_tax / sum(i["price"] * i["quantity"] for i in items), 4))

            return {
                "total_tax": round(total_tax, 2),
                "breakdown": tax_breakdown,
                "currency": currency
            }

    def _resolve_tax_rules(self, country: str, region: str):
        """Load applicable tax rules. This might call an external tax API."""
        with tracer.start_as_current_span("tax.resolve_rules") as span:
            span.set_attribute("tax.country", country)
            span.set_attribute("tax.region", region)

            # Check if we need to call an external tax provider
            if country in self.complex_tax_countries:
                span.set_attribute("tax.provider", "external")
                rules = self._fetch_from_tax_provider(country, region)
            else:
                span.set_attribute("tax.provider", "internal")
                rules = self._load_internal_rules(country, region)

            span.set_attribute("tax.rules_count", len(rules))
            return rules
```

## The Pricing Orchestrator

The orchestrator ties everything together. Its span becomes the parent for all pricing sub-operations.

```python
class PricingOrchestrator:
    def get_display_price(self, product_id: str, quantity: int,
                          user_currency: str, shipping_address: dict):
        with tracer.start_as_current_span("pricing.get_display_price") as span:
            span.set_attribute("product.id", product_id)
            span.set_attribute("pricing.target_currency", user_currency)
            span.set_attribute("pricing.quantity", quantity)

            # Step 1: Get base price in USD
            base_price = self.catalog.get_price(product_id)
            span.set_attribute("pricing.base_usd", base_price)

            # Step 2: Convert currency
            converted_price, rate = self.currency_svc.convert(
                base_price * quantity, "USD", user_currency
            )

            # Step 3: Calculate tax
            tax_result = self.tax_svc.calculate_tax(
                items=[{"product_id": product_id, "price": converted_price,
                        "quantity": quantity, "category": self.catalog.get_category(product_id)}],
                shipping_address=shipping_address,
                currency=user_currency
            )

            final_price = converted_price + tax_result["total_tax"]
            span.set_attribute("pricing.final_price", final_price)
            span.set_attribute("pricing.tax_included", tax_result["total_tax"])

            return {
                "price": final_price,
                "currency": user_currency,
                "tax": tax_result,
                "exchange_rate": rate
            }
```

## Debugging Pricing Discrepancies

When a customer reports seeing a wrong price, you can search traces by product ID and user currency to see exactly what exchange rate was used, what tax rules were applied, and whether any external API call returned stale data. The `currency.rate_age_seconds` attribute is especially useful because it tells you if the user saw a price based on a rate that was minutes old versus one that was freshly fetched.

This level of tracing turns pricing bugs from "we cannot reproduce it" into "here is the exact exchange rate and tax rule that produced that number."
