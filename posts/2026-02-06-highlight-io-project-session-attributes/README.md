# How to Configure highlight.project_id and highlight.session_id Resource Attributes for the Highlight.io Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Highlight.io, Resource Attributes, Session Correlation

Description: Configure highlight.project_id and highlight.session_id resource attributes to connect backend OpenTelemetry data with Highlight.io sessions.

Highlight.io uses two key resource attributes to route and correlate telemetry: `highlight.project_id` identifies which Highlight project the data belongs to, and `highlight.session_id` links backend traces to frontend session replays. Getting these right is essential for the full Highlight.io experience.

## Understanding the Two Attributes

- **highlight.project_id**: A static identifier for your Highlight project. Every span and log record must include this for Highlight.io to accept and route the data. You get this from your Highlight.io project settings.

- **highlight.session_id**: A dynamic identifier that links a backend request to a specific user's browser session. The frontend Highlight.io SDK generates this and passes it to the backend through HTTP headers.

## Setting highlight.project_id

This attribute goes on the resource, which means it is set once when the tracer provider is initialized:

```python
from opentelemetry.sdk.resources import Resource

# Set highlight.project_id in the resource
resource = Resource.create({
    "service.name": "api-backend",
    "highlight.project_id": "abc123def456",  # From your Highlight.io settings
})
```

In Go:

```go
res, _ := resource.New(ctx,
    resource.WithAttributes(
        semconv.ServiceName("api-backend"),
        attribute.String("highlight.project_id", "abc123def456"),
    ),
)
```

Using environment variables:

```bash
export OTEL_RESOURCE_ATTRIBUTES="highlight.project_id=abc123def456,service.name=api-backend"
```

## Setting highlight.session_id Per Request

The session ID changes with every user session. The Highlight.io frontend SDK sends it in the `x-highlight-request` header with the format `sessionId/requestId`. You need middleware to extract this and set it on each span.

### Python Flask Middleware

```python
from flask import Flask, request, g
from opentelemetry import trace

app = Flask(__name__)
tracer = trace.get_tracer("api-backend")

@app.before_request
def extract_highlight_context():
    """Extract Highlight.io session context from the request header."""
    highlight_header = request.headers.get("x-highlight-request", "")

    if highlight_header:
        parts = highlight_header.split("/")

        # Store in Flask's request context
        g.highlight_session_id = parts[0] if len(parts) >= 1 else ""
        g.highlight_request_id = parts[1] if len(parts) >= 2 else ""

        # Set on the current span
        span = trace.get_current_span()
        if span.is_recording():
            span.set_attribute("highlight.session_id", g.highlight_session_id)
            if g.highlight_request_id:
                span.set_attribute("highlight.trace_id", g.highlight_request_id)
    else:
        g.highlight_session_id = ""
        g.highlight_request_id = ""
```

### Node.js Express Middleware

```javascript
const { trace } = require("@opentelemetry/api");

function highlightMiddleware(req, res, next) {
  const highlightHeader = req.headers["x-highlight-request"] || "";

  if (highlightHeader) {
    const parts = highlightHeader.split("/");
    const sessionId = parts[0] || "";
    const requestId = parts[1] || "";

    // Set on the current span
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute("highlight.session_id", sessionId);
      if (requestId) {
        span.setAttribute("highlight.trace_id", requestId);
      }
    }

    // Make available to downstream handlers
    req.highlightSessionId = sessionId;
    req.highlightRequestId = requestId;
  }

  next();
}

// Apply to your Express app
app.use(highlightMiddleware);
```

### Go Chi/Gorilla Middleware

```go
package middleware

import (
    "net/http"
    "strings"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

func HighlightMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        highlightHeader := r.Header.Get("x-highlight-request")

        if highlightHeader != "" {
            parts := strings.SplitN(highlightHeader, "/", 2)

            span := trace.SpanFromContext(r.Context())
            if span.IsRecording() {
                span.SetAttributes(
                    attribute.String("highlight.session_id", parts[0]),
                )
                if len(parts) > 1 {
                    span.SetAttributes(
                        attribute.String("highlight.trace_id", parts[1]),
                    )
                }
            }
        }

        next.ServeHTTP(w, r)
    })
}
```

## Propagating Session ID to Downstream Services

If your backend makes calls to other microservices, propagate the session ID:

```python
import requests

def call_payment_service(payment_data):
    """Forward the Highlight session ID to downstream services."""
    with tracer.start_as_current_span("call_payment_service") as span:
        headers = {"Content-Type": "application/json"}

        # Forward the Highlight session context
        if hasattr(g, "highlight_session_id") and g.highlight_session_id:
            headers["x-highlight-request"] = (
                f"{g.highlight_session_id}/{g.highlight_request_id}"
            )
            span.set_attribute("highlight.session_id", g.highlight_session_id)

        response = requests.post(
            "http://payment-service/api/pay",
            json=payment_data,
            headers=headers,
        )
        return response.json()
```

## Collector Configuration

If using the OpenTelemetry Collector, ensure it preserves the Highlight attributes:

```yaml
processors:
  resource:
    attributes:
      # Ensure highlight.project_id is set even if not in the app resource
      - key: highlight.project_id
        value: "abc123def456"
        action: upsert

exporters:
  otlp/highlight:
    endpoint: "otel.highlight.io:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/highlight]
```

## Frontend Setup

For completeness, here is how the frontend Highlight.io SDK sends the header:

```javascript
// In your frontend application
import { H } from "highlight.run";

H.init("abc123def456", {
  networkRecording: {
    enabled: true,
    // This automatically adds x-highlight-request to fetch/XHR requests
    recordHeadersAndBody: true,
  },
});
```

## Verifying the Integration

In the Highlight.io dashboard, navigate to a session replay. If the backend integration is working, you will see:
- Backend errors linked to the specific session
- Request traces showing up in the session timeline
- Log entries correlated with both the session and the trace

If traces appear but are not linked to sessions, verify that the `x-highlight-request` header is being sent by the frontend and captured by your middleware. Check your browser's network tab to confirm the header is present on API requests.

These two attributes are the bridge between Highlight.io's frontend session replay and OpenTelemetry's backend tracing. Without `highlight.project_id`, data is rejected. Without `highlight.session_id`, data arrives but cannot be correlated with user sessions.
