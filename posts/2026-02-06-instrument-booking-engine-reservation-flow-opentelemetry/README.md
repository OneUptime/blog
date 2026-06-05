# How to Instrument Booking Engine Reservation Flow with OpenTelemetry End-to-End

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Booking Engine, Travel, End-to-End Tracing

Description: Instrument the complete booking engine reservation flow from search to confirmation using OpenTelemetry end-to-end tracing.

A travel booking engine guides users through a multi-step funnel: search, select, book, and confirm. Each step involves different services, external APIs, and potential failure points. Losing visibility at any step means losing the ability to diagnose why bookings fail or why conversion drops at a specific stage. This post shows how to instrument the entire reservation flow with OpenTelemetry so you can correlate a single booking from the first search to the final confirmation email.

## The Booking Funnel

The typical booking funnel looks like this:

1. **Search**: User enters travel criteria, system queries availability
2. **Select**: User picks a specific option, system validates pricing
3. **Book**: User provides payment and traveler details, system creates the reservation
4. **Confirm**: System issues tickets/vouchers, sends confirmation

Each transition between steps can lose users. OpenTelemetry helps you understand both the technical performance and the business impact at each step.

## Creating a Session-Level Trace

OpenTelemetry trace context should be propagated with the standard `traceparent` and `tracestate` headers between services. Across multiple independent browser requests in the same booking funnel, propagate a booking session ID as a correlation attribute:

```javascript
const { trace, context, SpanKind, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('booking-engine');

// Middleware that maintains booking session correlation context
function bookingSessionMiddleware(req, res, next) {
  const sessionId = req.headers['x-booking-session'] || generateSessionId();
  req.bookingSessionId = sessionId;

  // Create a span for this request and attach the booking session ID
  const span = tracer.startSpan('booking.session_request', {
    kind: SpanKind.SERVER,
    attributes: {
      'booking.session_id': sessionId,
      'booking.step': identifyBookingStep(req.path),
      'booking.channel': req.headers['x-booking-channel'] || 'web',
      'booking.locale': req.headers['accept-language'],
    },
  });

  // Attach session ID to response for client to propagate
  res.setHeader('x-booking-session', sessionId);

  const ctx = trace.setSpan(context.active(), span);
  context.with(ctx, () => {
    res.on('finish', () => {
      span.setAttribute('http.response.status_code', res.statusCode);
      span.end();
    });
    next();
  });
}
```

## Instrumenting the Search Step

```javascript
async function handleSearch(req, res) {
  return tracer.startActiveSpan('booking.search', async (span) => {
    try {
      const params = req.body;
      span.setAttribute('booking.search_type', params.type); // 'flight', 'hotel', 'package'
      span.setAttribute('booking.origin', params.origin);
      span.setAttribute('booking.destination', params.destination);
      span.setAttribute('booking.pax_count', params.passengers);

      const results = await searchAvailability(params);
      const prices = results.map((result) => result.price);

      span.setAttribute('booking.results_count', results.length);
      span.setAttribute('booking.cheapest_price', prices.length ? Math.min(...prices) : 0);
      span.setAttribute('booking.most_expensive_price', prices.length ? Math.max(...prices) : 0);

      res.json({ results, sessionId: req.bookingSessionId });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Instrumenting the Select Step

When a user selects an option, the system needs to validate that the price is still current:

```javascript
async function handleSelect(req, res) {
  return tracer.startActiveSpan('booking.select', async (span) => {
    try {
      const { optionId, sessionId } = req.body;
      span.setAttribute('booking.option_id', optionId);
      span.setAttribute('booking.session_id', sessionId);

      // Re-validate pricing with the supplier
      const priceCheck = await tracer.startActiveSpan(
        'booking.price_verification',
        async (priceSpan) => {
          try {
            const result = await verifyPriceWithSupplier(optionId);
            priceSpan.setAttribute('booking.original_price', result.originalPrice);
            priceSpan.setAttribute('booking.current_price', result.currentPrice);
            priceSpan.setAttribute('booking.price_changed', result.priceChanged);
            priceSpan.setAttribute('booking.price_change_amount', result.priceDelta);
            return result;
          } finally {
            priceSpan.end();
          }
        }
      );

      if (priceCheck.priceChanged) {
        span.addEvent('price_change_detected', {
          'booking.old_price': priceCheck.originalPrice,
          'booking.new_price': priceCheck.currentPrice,
        });
      }

      // Hold inventory temporarily
      const hold = await tracer.startActiveSpan('booking.hold_inventory', async (holdSpan) => {
        try {
          const result = await holdInventory(optionId, 900); // 15-minute hold
          holdSpan.setAttribute('booking.hold_id', result.id);
          holdSpan.setAttribute('booking.hold_expires_at', result.expiresAt);
          return result;
        } finally {
          holdSpan.end();
        }
      });

      res.json({ priceCheck, holdId: hold.id });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Instrumenting the Book Step

The booking step is the most critical. It involves payment processing, reservation creation, and inventory confirmation:

```javascript
async function handleBook(req, res) {
  return tracer.startActiveSpan('booking.create_reservation', async (span) => {
    const { holdId, paymentDetails, travelers, sessionId } = req.body;
    span.setAttribute('booking.session_id', sessionId);
    span.setAttribute('booking.hold_id', holdId);
    span.setAttribute('booking.traveler_count', travelers.length);

    try {
      // Step 1: Process payment
      const payment = await tracer.startActiveSpan(
        'booking.process_payment',
        async (paySpan) => {
          try {
            paySpan.setAttribute('booking.payment_method', paymentDetails.method);
            paySpan.setAttribute('booking.payment_currency', paymentDetails.currency);
            // Do not log full card numbers - just last 4 digits
            paySpan.setAttribute('booking.card_last_four', paymentDetails.lastFour);

            const result = await processPayment(paymentDetails);
            paySpan.setAttribute('booking.payment_status', result.status);
            paySpan.setAttribute('booking.payment_transaction_id', result.transactionId);
            return result;
          } finally {
            paySpan.end();
          }
        }
      );

      if (payment.status !== 'approved') {
        span.setAttribute('booking.failure_reason', 'payment_declined');
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Payment declined' });
        return res.status(402).json({ error: 'Payment declined' });
      }

      // Step 2: Confirm with supplier
      const confirmation = await tracer.startActiveSpan(
        'booking.supplier_confirm',
        async (confSpan) => {
          try {
            const result = await confirmWithSupplier(holdId, travelers);
            confSpan.setAttribute('booking.confirmation_number', result.confirmationNumber);
            confSpan.setAttribute('booking.supplier_status', result.status);
            return result;
          } finally {
            confSpan.end();
          }
        }
      );

      // Step 3: Create booking record
      const booking = await createBookingRecord({
        confirmation,
        payment,
        travelers,
        sessionId,
      });

      span.setAttribute('booking.booking_id', booking.id);
      span.setAttribute('booking.confirmation_number', confirmation.confirmationNumber);
      span.setAttribute('booking.status', 'confirmed');

      res.json({ bookingId: booking.id, confirmationNumber: confirmation.confirmationNumber });

    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);

      // If payment was taken but supplier confirmation failed, we need to refund
      if (error.stage === 'supplier_confirm') {
        await initiateRefund(error.paymentTransactionId);
        span.addEvent('refund_initiated');
      }

      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Tracking Funnel Conversion Metrics

```javascript
const { metrics } = require('@opentelemetry/api');
const meter = metrics.getMeter('booking-engine');

const funnelStep = meter.createCounter('booking.funnel_step', {
  description: 'Counts how many users reach each step of the booking funnel',
});

// Record in each handler
funnelStep.add(1, { 'booking.step': 'search', 'booking.channel': channel });
funnelStep.add(1, { 'booking.step': 'select', 'booking.channel': channel });
funnelStep.add(1, { 'booking.step': 'book', 'booking.channel': channel });
funnelStep.add(1, { 'booking.step': 'confirm', 'booking.channel': channel });
```

## Conclusion

Instrumenting the entire booking funnel with OpenTelemetry end-to-end tracing gives you the ability to correlate a single customer journey from search to confirmation. By tracking price verification, inventory holds, payment processing, and supplier confirmations as related spans, you can quickly diagnose where bookings fail and optimize every step of the conversion funnel.
