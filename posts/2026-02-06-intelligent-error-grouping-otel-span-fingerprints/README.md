# How to Implement Intelligent Error Grouping Strategies Based on OpenTelemetry Span Fingerprints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Error Grouping, Fingerprinting, Observability

Description: Implement intelligent error grouping using OpenTelemetry span fingerprints to reduce alert noise and identify unique failures.

One of the biggest problems in error tracking is grouping. If every occurrence of the same bug creates a separate alert, your team drowns in noise. If grouping is too aggressive, different bugs get merged into one issue and you miss real problems. This post walks through building intelligent error grouping based on OpenTelemetry span data, using fingerprints derived from span attributes, exception details, and call paths.

## What Makes a Good Error Fingerprint?

A fingerprint is a string that identifies a group of related error occurrences. Two errors with the same fingerprint are considered the same issue. The fingerprint should be stable enough that the same root cause always produces the same fingerprint, but specific enough that different root causes produce different ones.

Good fingerprint ingredients from OpenTelemetry spans:
- Exception type (e.g., `ConnectionRefusedError`)
- The span name where the error occurred (e.g., `POST /api/orders`)
- The service name (to separate the same error in different services)
- Key span attributes (e.g., `db.system`, `rpc.method`)

Bad fingerprint ingredients:
- Timestamps (always unique)
- Request IDs or trace IDs (always unique)
- Full error messages with dynamic values (e.g., "User 12345 not found")

## Building the Fingerprint Generator

```python
# fingerprint.py - Generate stable error fingerprints from span data
import hashlib
import re

class ErrorFingerprinter:
    """
    Generates stable fingerprints for error grouping based on
    OpenTelemetry span data.
    """

    # Patterns to strip from error messages to normalize them
    DYNAMIC_PATTERNS = [
        r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b',  # UUIDs
        r'\b\d{10,}\b',   # Long numeric IDs
        r"'[^']*'",       # Single-quoted strings
        r'"[^"]*"',       # Double-quoted strings
        r'\b\d+\.\d+\.\d+\.\d+\b',  # IP addresses
    ]

    def generate(self, span_data):
        """
        Generate a fingerprint from span data.
        Returns a hex digest string.
        """
        components = []

        # Component 1: Service name
        service = span_data.get("resource", {}).get("service.name", "unknown")
        components.append(f"service:{service}")

        # Component 2: Normalized span name
        span_name = self._normalize_span_name(span_data.get("name", ""))
        components.append(f"span:{span_name}")

        # Component 3: Exception type (most important for grouping)
        exc_type = self._get_exception_type(span_data)
        components.append(f"exc:{exc_type}")

        # Component 4: Normalized error message
        exc_message = self._get_normalized_message(span_data)
        components.append(f"msg:{exc_message}")

        # Component 5: Error location from stack trace (top frame only)
        location = self._get_error_location(span_data)
        if location:
            components.append(f"loc:{location}")

        # Join and hash
        fingerprint_input = "|".join(components)
        return hashlib.sha256(fingerprint_input.encode()).hexdigest()[:16]

    def _normalize_span_name(self, name):
        """Replace dynamic path segments with placeholders."""
        # Turn /api/users/12345/orders into /api/users/{id}/orders
        normalized = re.sub(r'/\d+', '/{id}', name)
        normalized = re.sub(
            r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
            '/{uuid}',
            normalized
        )
        return normalized

    def _get_exception_type(self, span_data):
        """Extract the exception type from span events."""
        for event in span_data.get("events", []):
            if event.get("name") == "exception":
                return event.get("attributes", {}).get(
                    "exception.type", "UnknownError"
                )
        return "NoException"

    def _get_normalized_message(self, span_data):
        """Get the error message with dynamic values stripped out."""
        for event in span_data.get("events", []):
            if event.get("name") == "exception":
                message = event.get("attributes", {}).get(
                    "exception.message", ""
                )
                return self._strip_dynamic_values(message)
        return ""

    def _strip_dynamic_values(self, text):
        """Remove IDs, UUIDs, and other dynamic values from text."""
        for pattern in self.DYNAMIC_PATTERNS:
            text = re.sub(pattern, "{dynamic}", text)
        return text.strip()

    def _get_error_location(self, span_data):
        """Extract the top stack frame as an error location."""
        for event in span_data.get("events", []):
            if event.get("name") == "exception":
                stacktrace = event.get("attributes", {}).get(
                    "exception.stacktrace", ""
                )
                if stacktrace:
                    # Get the last frame (most specific location)
                    lines = stacktrace.strip().split("\n")
                    for line in reversed(lines):
                        if "File " in line:
                            return line.strip()
        return None
```

## Integrating with a Span Processor

```python
# grouping_processor.py
from opentelemetry.sdk.trace import SpanProcessor
from fingerprint import ErrorFingerprinter

class ErrorGroupingProcessor(SpanProcessor):
    """Groups errors by fingerprint and tracks unique error groups."""

    def __init__(self):
        self.fingerprinter = ErrorFingerprinter()
        self.error_groups = {}  # fingerprint -> count and metadata

    def on_end(self, span):
        if span.status.status_code.name != "ERROR":
            return

        span_data = {
            "name": span.name,
            "resource": dict(span.resource.attributes),
            "attributes": dict(span.attributes) if span.attributes else {},
            "events": [
                {
                    "name": e.name,
                    "attributes": dict(e.attributes) if e.attributes else {},
                }
                for e in span.events
            ],
        }

        fingerprint = self.fingerprinter.generate(span_data)

        if fingerprint not in self.error_groups:
            self.error_groups[fingerprint] = {
                "count": 0,
                "first_seen": span.start_time,
                "span_name": span.name,
                "exception_type": self.fingerprinter._get_exception_type(span_data),
            }

        self.error_groups[fingerprint]["count"] += 1
        self.error_groups[fingerprint]["last_seen"] = span.end_time

    def get_error_summary(self):
        """Return a summary of all error groups."""
        return sorted(
            self.error_groups.items(),
            key=lambda x: x[1]["count"],
            reverse=True,
        )
```

## Testing Your Fingerprints

```python
# test_fingerprint.py - Verify grouping behavior
fingerprinter = ErrorFingerprinter()

# These two should produce the same fingerprint
span1 = {
    "name": "GET /api/users/123",
    "resource": {"service.name": "user-service"},
    "events": [{"name": "exception", "attributes": {
        "exception.type": "NotFoundError",
        "exception.message": "User 123 not found",
    }}],
}

span2 = {
    "name": "GET /api/users/456",
    "resource": {"service.name": "user-service"},
    "events": [{"name": "exception", "attributes": {
        "exception.type": "NotFoundError",
        "exception.message": "User 456 not found",
    }}],
}

fp1 = fingerprinter.generate(span1)
fp2 = fingerprinter.generate(span2)
assert fp1 == fp2, "Same error type on same endpoint should group together"
```

## Conclusion

Smart error grouping based on OpenTelemetry span fingerprints drastically reduces alert fatigue. By normalizing dynamic values, using exception types as primary grouping keys, and including span context, you can build grouping logic that catches real issues while suppressing duplicates. The approach is deterministic, testable, and works with any OpenTelemetry-compatible backend.
