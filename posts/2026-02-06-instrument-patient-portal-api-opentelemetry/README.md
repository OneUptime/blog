# How to Instrument Patient Portal and Health App API Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Patient Portal, Health Apps, API Performance

Description: Instrument patient portal and health app APIs with OpenTelemetry to track performance, errors, and user experience across all endpoints.

Patient portals and health apps are how millions of patients access their medical records, schedule appointments, message their doctors, and view test results. Unlike internal clinical systems where a few seconds of latency is tolerable, patient-facing apps compete with consumer app expectations. If your patient portal takes 8 seconds to load lab results, patients will call the office instead, driving up costs and frustrating staff.

This post covers instrumenting patient portal APIs with OpenTelemetry to track the performance metrics that directly affect patient satisfaction.

## Setting Up OpenTelemetry for a Node.js Patient Portal API

Most patient portals run as web applications with REST or GraphQL APIs. Here is the setup for a Node.js Express backend:

```javascript
// tracing.js - Initialize before any other imports
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');

const sdk = new NodeSDK({
  serviceName: 'patient-portal-api',
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4317',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://otel-collector:4317',
    }),
    exportIntervalMillis: 15000,
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PgInstrumentation(),
  ],
});

sdk.start();
```

## Tracing Patient Authentication Flows

Authentication is the first thing a patient does, and it needs to be fast and reliable:

```javascript
const { trace, metrics, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('patient-portal', '1.0.0');
const meter = metrics.getMeter('patient-portal', '1.0.0');

// Track login latency by authentication method
const loginLatency = meter.createHistogram('portal.auth.login_latency_ms', {
  description: 'Patient login latency in milliseconds',
  unit: 'ms',
});

const loginAttempts = meter.createCounter('portal.auth.login_attempts_total', {
  description: 'Total patient login attempts',
});

async function authenticatePatient(req, res) {
  const authMethod = req.body.method || 'password'; // password, mfa, sso

  return tracer.startActiveSpan('portal.auth.login', async (span) => {
    span.setAttribute('portal.auth.method', authMethod);

    const start = Date.now();

    try {
      // Step 1: Validate credentials
      const credResult = await tracer.startActiveSpan(
        'portal.auth.validate_credentials',
        async (credSpan) => {
          try {
            const result = await validateCredentials(req.body);
            credSpan.setAttribute('portal.auth.valid', result.valid);
            return result;
          } finally {
            credSpan.end();
          }
        }
      );

      if (!credResult.valid) {
        loginAttempts.add(1, { method: authMethod, result: 'invalid_credentials' });
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Invalid credentials' });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Step 2: MFA challenge if enabled
      if (credResult.mfaRequired) {
        await tracer.startActiveSpan('portal.auth.mfa_challenge', async (mfaSpan) => {
          try {
            mfaSpan.setAttribute('portal.auth.mfa_type', credResult.mfaType);
            const mfaResult = await sendMfaChallenge(credResult.userId);
            mfaSpan.setAttribute('portal.auth.mfa_sent', mfaResult.success);
          } finally {
            mfaSpan.end();
          }
        });
      }

      // Step 3: Generate session token
      const token = await tracer.startActiveSpan(
        'portal.auth.generate_token',
        async (tokenSpan) => {
          try {
            return await generateSessionToken(credResult.userId);
          } finally {
            tokenSpan.end();
          }
        }
      );

      const duration = Date.now() - start;
      loginLatency.record(duration, { method: authMethod, result: 'success' });
      loginAttempts.add(1, { method: authMethod, result: 'success' });

      return res.json({ token, mfaRequired: credResult.mfaRequired });
    } catch (error) {
      loginAttempts.add(1, { method: authMethod, result: 'error' });
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Tracing Lab Results and Medical Records Access

Loading lab results is one of the most common patient portal actions and often one of the slowest because it queries the EHR:

```javascript
async function getLabResults(req, res) {
  return tracer.startActiveSpan('portal.lab_results.fetch', async (span) => {
    span.setAttribute('portal.endpoint', '/api/lab-results');
    span.setAttribute('portal.request.date_range', req.query.dateRange || 'recent');

    try {
      // Step 1: Verify the patient has access to these results
      const authorized = await tracer.startActiveSpan('portal.authz.check', async (authzSpan) => {
        try {
          const result = await checkPatientAuthorization(
            req.userId,
            'lab_results',
            'read'
          );
          authzSpan.setAttribute('portal.authz.granted', result);
          return result;
        } finally {
          authzSpan.end();
        }
      });

      if (!authorized) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Unauthorized' });
        return res.status(403).json({ error: 'Access denied' });
      }

      // Step 2: Query the FHIR server for Observation resources
      const observations = await tracer.startActiveSpan(
        'portal.fhir.query_observations',
        async (fhirSpan) => {
          try {
            fhirSpan.setAttribute('fhir.resource_type', 'Observation');
            fhirSpan.setAttribute('fhir.category', 'laboratory');

            const result = await fhirClient.search({
              resourceType: 'Observation',
              searchParams: {
                patient: req.userId,
                category: 'laboratory',
                _sort: '-date',
                _count: 50,
              },
            });

            fhirSpan.setAttribute('fhir.result_count', result.entry?.length || 0);
            return result;
          } finally {
            fhirSpan.end();
          }
        }
      );

      // Step 3: Transform FHIR resources into portal-friendly format
      const formatted = tracer.startActiveSpan('portal.transform.lab_results', (transformSpan) => {
        try {
          const result = transformLabResults(observations);
          transformSpan.setAttribute('portal.transform.output_count', result.length);
          return result;
        } finally {
          transformSpan.end();
        }
      });

      span.setAttribute('portal.response.result_count', formatted.length);

      return res.json({ results: formatted });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Tracing Appointment Scheduling

Appointment scheduling involves checking availability, which often requires real-time queries to the EHR scheduling module:

```javascript
async function searchAvailableSlots(req, res) {
  return tracer.startActiveSpan('portal.appointments.search_slots', async (span) => {
    span.setAttribute('portal.endpoint', '/api/appointments/available');
    span.setAttribute('portal.appointment.specialty', req.query.specialty);
    span.setAttribute('portal.appointment.location', req.query.location || 'any');

    try {
      // Query the scheduling system for available slots
      const slots = await tracer.startActiveSpan(
        'portal.scheduling.query_availability',
        async (schedSpan) => {
          try {
            schedSpan.setAttribute('scheduling.system', 'epic');

            const result = await schedulingService.findAvailableSlots({
              specialty: req.query.specialty,
              location: req.query.location,
              dateStart: req.query.startDate,
              dateEnd: req.query.endDate,
            });

            schedSpan.setAttribute('scheduling.slots_found', result.length);
            schedSpan.setAttribute('scheduling.providers_with_availability',
              new Set(result.map(s => s.providerId)).size);
            return result;
          } finally {
            schedSpan.end();
          }
        }
      );

      span.setAttribute('portal.response.slots_count', slots.length);

      return res.json({ slots });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Measuring Real User Experience

Beyond server-side tracing, capture client-side performance in the patient's browser:

```javascript
// portal-client-metrics.js (runs in the patient's browser)
import { metrics } from '@opentelemetry/api';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: 'https://otel-gateway.example.com/v1/metrics',
      }),
      exportIntervalMillis: 15000,
    }),
  ],
});

metrics.setGlobalMeterProvider(meterProvider);

const meter = metrics.getMeter('patient-portal-client');

const pageLoadTime = meter.createHistogram('portal.client.page_load_ms', {
  description: 'Client-side page load time',
  unit: 'ms',
});

// Capture navigation timing for each page
window.addEventListener('load', () => {
  const navEntry = performance.getEntriesByType('navigation')[0];
  if (navEntry) {
    pageLoadTime.record(navEntry.loadEventEnd - navEntry.fetchStart, {
      'portal.page': window.location.pathname,
    });
  }
});
```

## Performance Targets

For patient portals, aim for these targets: authentication under 2 seconds, lab results page load under 3 seconds, appointment search under 4 seconds, and messaging inbox under 2 seconds. With OpenTelemetry tracing on every endpoint, you can quickly identify whether slow responses come from your authorization layer, the FHIR server, the database, or data transformation. That visibility is what lets you keep the patient experience smooth while dealing with the inherent complexity of healthcare data backends.
