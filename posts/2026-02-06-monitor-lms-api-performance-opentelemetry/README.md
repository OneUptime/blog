# How to Monitor Learning Management System (Canvas, Moodle, Blackboard) API Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, LMS, Education, API Monitoring

Description: Learn how to monitor Canvas, Moodle, and Blackboard LMS API performance using OpenTelemetry for better EdTech observability.

Learning Management Systems like Canvas, Moodle, and Blackboard are the backbone of modern education. When these platforms experience slow API responses or outages, thousands of students and instructors are affected. This post walks through setting up OpenTelemetry to monitor LMS API performance so you can catch issues before they disrupt learning.

## Why LMS API Monitoring Matters

Most LMS platforms expose REST APIs for grade submissions, course content retrieval, enrollment management, and assignment workflows. During peak periods like midterms or finals week, these APIs can become bottlenecks. Without proper observability, your team is left guessing when something goes wrong.

OpenTelemetry gives you a vendor-neutral way to collect traces, metrics, and logs from your LMS integrations. Whether you are building custom integrations or running middleware between your SIS and LMS, this approach works.

## Setting Up the OpenTelemetry SDK

First, install the required packages for a Node.js-based LMS integration service:

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-otlp-grpc
```

Configure the SDK in your application entry point:

```javascript
// tracing.js - Initialize OpenTelemetry before any other imports
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'lms-integration-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.2.0',
    // Tag which LMS this service connects to
    'lms.platform': 'canvas',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'grpc://your-otel-collector:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

## Instrumenting LMS API Calls

When your service calls the Canvas REST API, wrap each call with a custom span that captures LMS-specific attributes:

```javascript
const { trace, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('lms-api-client');

async function getStudentGrades(courseId, studentId) {
  return tracer.startActiveSpan('canvas.api.get_grades', async (span) => {
    // Add attributes that help you filter and search later
    span.setAttribute('lms.platform', 'canvas');
    span.setAttribute('lms.course_id', courseId);
    span.setAttribute('lms.api_endpoint', '/api/v1/courses/{id}/students/submissions');
    span.setAttribute('lms.operation', 'get_grades');

    try {
      const startTime = Date.now();
      const response = await fetch(
        `https://your-canvas.instructure.com/api/v1/courses/${courseId}/students/submissions?student_ids[]=${studentId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.CANVAS_API_TOKEN}`,
          },
        }
      );

      // Record response metadata
      span.setAttribute('http.status_code', response.status);
      span.setAttribute('lms.response_time_ms', Date.now() - startTime);
      span.setAttribute('lms.rate_limit_remaining', response.headers.get('x-rate-limit-remaining'));

      if (!response.ok) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `API returned ${response.status}` });
      }

      return await response.json();
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

## Tracking Rate Limits Across LMS Platforms

Each LMS has different rate limiting behavior. Canvas uses a token bucket approach, Moodle has per-function limits, and Blackboard throttles based on API keys. Tracking these as metrics helps you avoid hitting limits:

```javascript
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('lms-api-client');

// Create a histogram for API response times per platform
const apiLatency = meter.createHistogram('lms.api.latency', {
  description: 'LMS API response time in milliseconds',
  unit: 'ms',
});

// Create a gauge for rate limit headroom
const rateLimitRemaining = meter.createObservableGauge('lms.api.rate_limit_remaining', {
  description: 'Remaining API calls before rate limit is hit',
});

// Record metrics after each API call
function recordApiMetrics(platform, endpoint, latencyMs, remaining) {
  apiLatency.record(latencyMs, {
    'lms.platform': platform,
    'lms.endpoint': endpoint,
  });
}
```

## Monitoring Moodle Web Service Calls

For Moodle, the pattern is similar but the API structure differs since Moodle uses a function-based web service approach:

```python
# Python example for Moodle web service monitoring
from opentelemetry import trace
from opentelemetry.trace import SpanKind
import requests

tracer = trace.get_tracer("moodle-integration")

def call_moodle_function(function_name, params):
    with tracer.start_as_current_span(
        f"moodle.ws.{function_name}",
        kind=SpanKind.CLIENT,
        attributes={
            "lms.platform": "moodle",
            "lms.ws_function": function_name,
            "lms.api_endpoint": "/webservice/rest/server.php",
        }
    ) as span:
        response = requests.get(
            f"{MOODLE_URL}/webservice/rest/server.php",
            params={
                "wstoken": MOODLE_TOKEN,
                "wsfunction": function_name,
                "moodlewsrestformat": "json",
                **params,
            }
        )
        span.set_attribute("http.status_code", response.status_code)

        # Moodle returns errors in the JSON body, not HTTP status
        data = response.json()
        if "exception" in data:
            span.set_status(trace.StatusCode.ERROR, data.get("message", "Unknown error"))

        return data
```

## Setting Up Alerts

Once your telemetry is flowing, set up alerts for the scenarios that matter most in education:

- API latency exceeding 2 seconds during class hours
- Rate limit remaining dropping below 10% capacity
- Error rates spiking above 5% on grade submission endpoints
- Enrollment API failures during registration periods

The key is to correlate these metrics with the academic calendar. A 500ms response time at 2 AM is fine. The same response time during a live exam submission window is a problem.

## Conclusion

Monitoring LMS APIs with OpenTelemetry gives your team the visibility needed to keep educational platforms running smoothly. By tagging spans with LMS-specific attributes like platform type, course IDs, and API function names, you can quickly pinpoint which integration is causing trouble and fix it before students notice.
