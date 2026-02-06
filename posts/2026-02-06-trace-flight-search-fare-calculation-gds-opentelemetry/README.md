# How to Trace Flight Search and Fare Calculation Across GDS (Amadeus, Sabre, Travelport) Systems with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GDS, Travel, Flight Search

Description: Trace flight search and fare calculation across Amadeus, Sabre, and Travelport GDS systems using OpenTelemetry distributed tracing.

Flight search is one of the most complex operations in travel technology. A single search request from a user can fan out to multiple Global Distribution Systems (GDS) like Amadeus, Sabre, and Travelport, each returning hundreds of fare options that need to be aggregated, deduplicated, and ranked. End-to-end latency matters enormously because travelers expect results in under 3 seconds. This post shows how to trace these distributed searches with OpenTelemetry.

## The Flight Search Architecture

When a traveler searches for flights, the typical flow is:

1. Search request arrives at your API gateway
2. Request is normalized and validated
3. Parallel requests are sent to multiple GDS providers
4. Each GDS returns flight and fare data in their own format
5. Results are normalized to a common schema
6. Duplicates are removed and results are ranked
7. Final results are returned to the user

The challenge is that each GDS has different latency characteristics, and a slow response from one provider should not block the entire search.

## Setting Up the Tracing Infrastructure

```javascript
// tracing.js - Initialize OpenTelemetry for the flight search service
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'flight-search-service',
    'service.version': '2.4.1',
    'deployment.environment': process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
});

sdk.start();
```

## Instrumenting the Fan-Out Search

The core of flight search is the parallel fan-out to multiple GDS systems. Each provider call gets its own span:

```javascript
const { trace, SpanStatusCode, SpanKind } = require('@opentelemetry/api');
const tracer = trace.getTracer('flight-search');

async function searchFlights(searchParams) {
  return tracer.startActiveSpan('flight.search', { kind: SpanKind.SERVER }, async (parentSpan) => {
    parentSpan.setAttribute('flight.origin', searchParams.origin);
    parentSpan.setAttribute('flight.destination', searchParams.destination);
    parentSpan.setAttribute('flight.departure_date', searchParams.departureDate);
    parentSpan.setAttribute('flight.return_date', searchParams.returnDate || 'one_way');
    parentSpan.setAttribute('flight.passengers', searchParams.passengers);
    parentSpan.setAttribute('flight.cabin_class', searchParams.cabinClass);

    // Fan out to all configured GDS providers in parallel
    const providers = ['amadeus', 'sabre', 'travelport'];
    const searchStart = Date.now();

    const results = await Promise.allSettled(
      providers.map(provider =>
        searchGDS(provider, searchParams, parentSpan)
      )
    );

    parentSpan.setAttribute('flight.total_search_time_ms', Date.now() - searchStart);

    // Collect successful results
    const allFlights = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allFlights.push(...result.value);
      } else {
        parentSpan.addEvent('gds_search_failed', {
          'flight.gds_provider': providers[index],
          'flight.error': result.reason.message,
        });
      }
    });

    parentSpan.setAttribute('flight.raw_results_count', allFlights.length);

    // Deduplicate and rank
    const ranked = await deduplicateAndRank(allFlights, parentSpan);
    parentSpan.setAttribute('flight.final_results_count', ranked.length);

    parentSpan.end();
    return ranked;
  });
}
```

## Tracing Individual GDS Calls

Each GDS provider call gets detailed instrumentation:

```javascript
async function searchGDS(provider, params, parentSpan) {
  const ctx = trace.setSpan(trace.active(), parentSpan);

  return tracer.startActiveSpan(
    `flight.gds.search.${provider}`,
    { kind: SpanKind.CLIENT },
    ctx,
    async (span) => {
      span.setAttribute('flight.gds_provider', provider);
      span.setAttribute('flight.gds_api_version', getApiVersion(provider));

      const requestStart = Date.now();

      try {
        // Build provider-specific request
        const request = buildGDSRequest(provider, params);
        span.setAttribute('flight.gds_request_type', request.type);

        // Make the API call with a timeout
        const response = await callGDSWithTimeout(provider, request, 5000);
        const latency = Date.now() - requestStart;

        span.setAttribute('flight.gds_response_time_ms', latency);
        span.setAttribute('flight.gds_results_count', response.flights.length);
        span.setAttribute('http.status_code', response.statusCode);

        // Normalize the response to common format
        return tracer.startActiveSpan(`flight.normalize.${provider}`, (normalizeSpan) => {
          const normalized = normalizeGDSResponse(provider, response);
          normalizeSpan.setAttribute('flight.normalized_count', normalized.length);
          normalizeSpan.end();
          return normalized;
        });

      } catch (error) {
        const latency = Date.now() - requestStart;
        span.setAttribute('flight.gds_response_time_ms', latency);

        if (error.name === 'TimeoutError') {
          span.setStatus({ code: SpanStatusCode.ERROR, message: `${provider} timed out after 5000ms` });
          span.setAttribute('flight.gds_timed_out', true);
        } else {
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.recordException(error);
        }
        throw error;
      } finally {
        span.end();
      }
    }
  );
}
```

## Instrumenting Fare Calculation

Fare calculation is complex because it involves fare rules, taxes, surcharges, and currency conversion:

```javascript
async function calculateFare(flight, passengerTypes) {
  return tracer.startActiveSpan('flight.fare.calculate', async (span) => {
    span.setAttribute('flight.carrier', flight.carrier);
    span.setAttribute('flight.fare_basis', flight.fareBasis);
    span.setAttribute('flight.booking_class', flight.bookingClass);

    // Base fare from GDS
    const baseFare = flight.baseFare;
    span.setAttribute('flight.base_fare', baseFare);
    span.setAttribute('flight.base_currency', flight.currency);

    // Calculate taxes
    const taxes = await tracer.startActiveSpan('flight.fare.taxes', async (taxSpan) => {
      const taxResult = calculateTaxes(flight, passengerTypes);
      taxSpan.setAttribute('flight.tax_components', taxResult.components.length);
      taxSpan.setAttribute('flight.total_tax', taxResult.total);
      taxSpan.end();
      return taxResult;
    });

    // Apply surcharges (fuel, security, etc.)
    const surcharges = await tracer.startActiveSpan('flight.fare.surcharges', async (surSpan) => {
      const result = calculateSurcharges(flight);
      surSpan.setAttribute('flight.surcharge_total', result.total);
      surSpan.end();
      return result;
    });

    // Currency conversion if needed
    let totalFare = baseFare + taxes.total + surcharges.total;
    if (flight.currency !== 'USD') {
      totalFare = await tracer.startActiveSpan('flight.fare.currency_convert', async (fxSpan) => {
        const converted = await convertCurrency(totalFare, flight.currency, 'USD');
        fxSpan.setAttribute('flight.fx_rate', converted.rate);
        fxSpan.setAttribute('flight.fx_source', converted.source);
        fxSpan.end();
        return converted.amount;
      });
    }

    span.setAttribute('flight.total_fare', totalFare);
    span.end();

    return { baseFare, taxes: taxes.total, surcharges: surcharges.total, total: totalFare };
  });
}
```

## Metrics for GDS Performance Comparison

Track per-provider metrics to understand which GDS delivers the best performance:

```javascript
const { metrics } = require('@opentelemetry/api');
const meter = metrics.getMeter('flight-search');

const gdsLatency = meter.createHistogram('flight.gds_latency_ms', {
  description: 'GDS API response time by provider',
  unit: 'ms',
});

const gdsAvailability = meter.createCounter('flight.gds_availability', {
  description: 'GDS availability by provider (success vs failure)',
});
```

## Conclusion

Tracing flight search across multiple GDS systems with OpenTelemetry gives you the visibility to optimize what is often the most latency-sensitive operation in a travel platform. By instrumenting the fan-out pattern, individual provider calls, and fare calculation steps, you can identify slow providers, tune timeouts, and ensure travelers get fast, accurate search results.
