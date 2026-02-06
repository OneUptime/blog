# How to Contribute a New Instrumentation Library to the OpenTelemetry Contrib Repository

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Open Source, Contrib, Instrumentation, Contributing

Description: Learn the step-by-step process for contributing a new instrumentation library to the official OpenTelemetry Contrib repository for community use.

If you have built an instrumentation library that would benefit the community, contributing it to the OpenTelemetry Contrib repository is the right move. It gives your instrumentation wider visibility, community review, and ongoing maintenance support. But the contrib repo has standards and processes you need to follow. This guide walks you through the entire contribution workflow.

## Before You Start

Make sure your instrumentation meets these prerequisites:

1. **The library/framework is popular enough** to justify inclusion. Check GitHub stars, npm/PyPI downloads, and community requests.
2. **Your instrumentation follows OpenTelemetry semantic conventions** for attribute names and span structures.
3. **You have tests** with good coverage.
4. **You are willing to maintain it** or find a co-maintainer.

## Step 1: Open an Issue First

Do not write code yet. Open an issue in the contrib repo to propose the new instrumentation:

```markdown
# Proposal: Instrumentation for [Library Name]

## Library Information
- Name: fastmq
- Language: Python
- GitHub: https://github.com/example/fastmq
- PyPI Downloads: 500k/month
- Description: A high-performance message queue client

## Motivation
There are currently no OpenTelemetry instrumentations for FastMQ.
Multiple users have requested this in issues #1234 and #5678.

## Proposed Instrumentation
- Trace spans for publish and consume operations
- Metrics for message throughput, processing time, and queue depth
- Context propagation through message headers

## Semantic Conventions
Will follow the messaging semantic conventions:
- messaging.system = "fastmq"
- messaging.operation = "publish" | "process"
- messaging.destination.name = queue name
```

Wait for feedback from maintainers before proceeding.

## Step 2: Fork and Set Up the Repo

```bash
# Fork the contrib repo on GitHub, then clone
git clone https://github.com/YOUR_USERNAME/opentelemetry-python-contrib.git
cd opentelemetry-python-contrib

# Create a feature branch
git checkout -b instrumentation-fastmq

# Set up the development environment
pip install tox
```

## Step 3: Create the Package Structure

Follow the existing convention in the repo:

```
instrumentation/opentelemetry-instrumentation-fastmq/
    src/
        opentelemetry/
            instrumentation/
                fastmq/
                    __init__.py
                    version.py
                    package.py
    tests/
        __init__.py
        test_fastmq_instrumentation.py
    pyproject.toml
    README.rst
    LICENSE
```

## Step 4: Implement the Instrumentation

Follow the patterns established by existing instrumentations in the repo:

```python
# src/opentelemetry/instrumentation/fastmq/__init__.py
"""OpenTelemetry FastMQ instrumentation"""

from typing import Collection
from opentelemetry.instrumentation.instrumentor import BaseInstrumentor
from opentelemetry.instrumentation.fastmq.version import __version__
from opentelemetry.instrumentation.fastmq.package import _instruments
from opentelemetry.trace import SpanKind, get_tracer
from opentelemetry.propagate import inject, extract
from opentelemetry.semconv.trace import SpanAttributes
from opentelemetry.metrics import get_meter
import fastmq

_SPAN_ATTR_MESSAGING_SYSTEM = "messaging.system"
_SPAN_ATTR_MESSAGING_OPERATION = "messaging.operation"
_SPAN_ATTR_MESSAGING_DESTINATION = "messaging.destination.name"


class FastMQInstrumentor(BaseInstrumentor):
    """An instrumentor for the FastMQ library."""

    def instrumentation_dependencies(self) -> Collection[str]:
        return _instruments

    def _instrument(self, **kwargs):
        tracer_provider = kwargs.get("tracer_provider")
        meter_provider = kwargs.get("meter_provider")

        self._tracer = get_tracer(
            __name__, __version__, tracer_provider
        )
        meter = get_meter(__name__, __version__, meter_provider)

        # Create metrics following semantic conventions
        self._publish_duration = meter.create_histogram(
            name="messaging.publish.duration",
            description="Duration of message publish operations",
            unit="ms",
        )
        self._process_duration = meter.create_histogram(
            name="messaging.process.duration",
            description="Duration of message processing",
            unit="ms",
        )

        # Save original methods for uninstrument
        self._original_publish = fastmq.Client.publish
        self._original_consume = fastmq.Client.consume

        # Monkey-patch
        instrumentor = self
        original_publish = self._original_publish

        def instrumented_publish(client_self, queue, message, **kw):
            attrs = {
                _SPAN_ATTR_MESSAGING_SYSTEM: "fastmq",
                _SPAN_ATTR_MESSAGING_OPERATION: "publish",
                _SPAN_ATTR_MESSAGING_DESTINATION: queue,
            }
            with instrumentor._tracer.start_as_current_span(
                f"{queue} publish",
                kind=SpanKind.PRODUCER,
                attributes=attrs,
            ) as span:
                # Inject trace context into message headers
                headers = kw.get("headers", {})
                inject(headers)
                kw["headers"] = headers

                return original_publish(client_self, queue, message, **kw)

        fastmq.Client.publish = instrumented_publish

    def _uninstrument(self, **kwargs):
        fastmq.Client.publish = self._original_publish
        fastmq.Client.consume = self._original_consume
```

## Step 5: Write Comprehensive Tests

The contrib repo expects thorough tests:

```python
# tests/test_fastmq_instrumentation.py
import unittest
from unittest.mock import patch, MagicMock
from opentelemetry.test.test_base import TestBase
from opentelemetry.instrumentation.fastmq import FastMQInstrumentor
from opentelemetry.trace import SpanKind
from opentelemetry.semconv.trace import SpanAttributes


class TestFastMQInstrumentation(TestBase):
    def setUp(self):
        super().setUp()
        FastMQInstrumentor().instrument()

    def tearDown(self):
        FastMQInstrumentor().uninstrument()
        super().tearDown()

    def test_publish_creates_producer_span(self):
        client = fastmq.Client("localhost:9092")
        client.publish("orders", {"id": 1})

        spans = self.memory_exporter.get_finished_spans()
        self.assertEqual(len(spans), 1)

        span = spans[0]
        self.assertEqual(span.name, "orders publish")
        self.assertEqual(span.kind, SpanKind.PRODUCER)
        self.assertEqual(
            span.attributes["messaging.system"], "fastmq"
        )
        self.assertEqual(
            span.attributes["messaging.destination.name"], "orders"
        )

    def test_context_propagation(self):
        """Verify trace context is injected into message headers."""
        client = fastmq.Client("localhost:9092")
        client.publish("orders", {"id": 1}, headers={})

        # Verify headers contain trace context
        # (check the mock to see what headers were passed)

    def test_uninstrument_restores_original(self):
        """Verify uninstrument restores the original methods."""
        FastMQInstrumentor().uninstrument()
        # Verify no spans are created after uninstrumenting
        client = fastmq.Client("localhost:9092")
        client.publish("orders", {"id": 1})

        spans = self.memory_exporter.get_finished_spans()
        self.assertEqual(len(spans), 0)

    def test_error_recording(self):
        """Verify errors are recorded on the span."""
        client = fastmq.Client("localhost:9092")
        with self.assertRaises(ConnectionError):
            client.publish("orders", {"id": 1})

        spans = self.memory_exporter.get_finished_spans()
        self.assertEqual(spans[0].status.status_code, StatusCode.ERROR)
```

## Step 6: Write Documentation

Create a `README.rst` following the repo's format:

```rst
OpenTelemetry FastMQ Instrumentation
=====================================

|pypi|

.. |pypi| image:: https://badge.fury.io/py/opentelemetry-instrumentation-fastmq.svg
   :target: https://pypi.org/project/opentelemetry-instrumentation-fastmq/

This library provides automatic instrumentation for `FastMQ <https://github.com/example/fastmq>`_.

Installation
------------

::

    pip install opentelemetry-instrumentation-fastmq

Usage
-----

.. code-block:: python

    from opentelemetry.instrumentation.fastmq import FastMQInstrumentor

    FastMQInstrumentor().instrument()

    # Use fastmq normally - traces are created automatically
    client = fastmq.Client("localhost:9092")
    client.publish("orders", {"id": 1})
```

## Step 7: Submit the PR

```bash
# Run the test suite
tox -e py311-test-instrumentation-fastmq

# Run linting
tox -e lint

# Commit and push
git add .
git commit -m "Add FastMQ instrumentation"
git push origin instrumentation-fastmq
```

Then open a PR and be prepared for review feedback. The maintainers will likely request changes around semantic convention compliance, test coverage, and edge case handling.

## Wrapping Up

Contributing to the OpenTelemetry Contrib repository is a structured process: propose first, then implement following existing patterns, write thorough tests, and document everything. The review process is rigorous but it ensures high quality across the entire ecosystem. Once merged, your instrumentation becomes part of the standard OpenTelemetry distribution and benefits every user of that library.
