# How to Build Custom Apache Beam Transforms in Python for Dataflow Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Apache Beam, Dataflow, Python, Data Pipelines

Description: A practical guide to building custom Apache Beam transforms in Python for Google Cloud Dataflow, covering PTransforms, DoFns, combiners, and composite transforms.

---

Apache Beam gives you a lot of built-in transforms for common operations like mapping, filtering, and grouping. But real-world data pipelines inevitably need custom logic - parsing proprietary formats, applying business rules, enriching data from external services, or handling complex aggregation patterns. That is where custom transforms come in.

Building good custom transforms in Beam is about more than just writing a function. You need to think about serialization, error handling, side inputs, and how your transform behaves in both batch and streaming modes. I have written hundreds of these for Dataflow pipelines, and the patterns I am sharing here are ones that have held up well in production.

## Understanding the Transform Hierarchy

Beam has three levels of custom logic you can write:

1. Simple functions used with `Map` or `FlatMap`
2. `DoFn` classes for stateful or complex element-wise processing
3. Composite `PTransform` classes that combine multiple operations into reusable units

Let's work through each one with practical examples.

## Simple Function Transforms

For straightforward transformations, use a function with `beam.Map` or `beam.FlatMap`:

```python
# simple_transforms.py
# Basic function transforms for common data operations
import apache_beam as beam
import json
from datetime import datetime

def parse_log_line(line):
    """Parse a raw log line into a structured dictionary."""
    parts = line.split(" ")
    return {
        "timestamp": parts[0],
        "level": parts[1],
        "service": parts[2],
        "message": " ".join(parts[3:]),
    }

def enrich_with_date_parts(record):
    """Add date components for easier partitioning and filtering."""
    ts = datetime.fromisoformat(record["timestamp"])
    record["year"] = ts.year
    record["month"] = ts.month
    record["day"] = ts.day
    record["hour"] = ts.hour
    return record

def filter_errors(record):
    """Return True only for error-level log records."""
    return record["level"] == "ERROR"

# Use them in a pipeline
with beam.Pipeline() as pipeline:
    (
        pipeline
        | "ReadLogs" >> beam.io.ReadFromText("gs://my-bucket/logs/*.log")
        | "ParseLines" >> beam.Map(parse_log_line)
        | "EnrichDates" >> beam.Map(enrich_with_date_parts)
        | "FilterErrors" >> beam.Filter(filter_errors)
        | "WriteErrors" >> beam.io.WriteToText("gs://my-bucket/errors/")
    )
```

## Building Custom DoFn Classes

When you need more control - setup/teardown, stateful processing, or multiple outputs - write a `DoFn` class:

```python
# custom_dofn.py
# DoFn with setup, teardown, and multiple outputs
import apache_beam as beam
from apache_beam import pvalue
import logging
import requests

class EnrichFromAPI(beam.DoFn):
    """
    DoFn that enriches records by calling an external API.
    Uses setup/teardown for connection management and
    outputs to multiple tagged collections for success/failure.
    """

    # Define output tags for routing successful and failed records
    SUCCESS = "success"
    FAILURE = "failure"

    def __init__(self, api_base_url, batch_size=50):
        self.api_base_url = api_base_url
        self.batch_size = batch_size
        self.session = None
        self.cache = {}

    def setup(self):
        """Called once per worker when the DoFn is initialized.
        Use this for expensive one-time setup like creating connections."""
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})
        logging.info("API session initialized")

    def process(self, element):
        """Process a single element, yielding to success or failure output."""
        record_id = element.get("id")

        # Check cache first to avoid redundant API calls
        if record_id in self.cache:
            element["enrichment"] = self.cache[record_id]
            yield pvalue.TaggedOutput(self.SUCCESS, element)
            return

        try:
            response = self.session.get(
                f"{self.api_base_url}/records/{record_id}",
                timeout=5,
            )
            response.raise_for_status()
            enrichment_data = response.json()

            # Cache the result for reuse
            self.cache[record_id] = enrichment_data
            element["enrichment"] = enrichment_data
            yield pvalue.TaggedOutput(self.SUCCESS, element)

        except Exception as e:
            element["error"] = str(e)
            yield pvalue.TaggedOutput(self.FAILURE, element)

    def teardown(self):
        """Called when the DoFn is being destroyed. Clean up resources."""
        if self.session:
            self.session.close()
            logging.info("API session closed")


# Use the DoFn with multiple outputs
with beam.Pipeline() as pipeline:
    results = (
        pipeline
        | "ReadInput" >> beam.io.ReadFromText("gs://my-bucket/input.jsonl")
        | "ParseJSON" >> beam.Map(json.loads)
        | "Enrich" >> beam.ParDo(
            EnrichFromAPI("https://api.example.com")
        ).with_outputs(EnrichFromAPI.SUCCESS, EnrichFromAPI.FAILURE)
    )

    # Access each output tag separately
    results[EnrichFromAPI.SUCCESS] | "WriteSuccess" >> beam.io.WriteToText(
        "gs://my-bucket/enriched/"
    )
    results[EnrichFromAPI.FAILURE] | "WriteFailures" >> beam.io.WriteToText(
        "gs://my-bucket/failures/"
    )
```

## Stateful DoFn for Streaming

When processing streaming data, you sometimes need to maintain state across elements. Beam's stateful DoFn handles this:

```python
# stateful_dofn.py
# Stateful DoFn that deduplicates events in a streaming pipeline
import apache_beam as beam
from apache_beam.transforms.userstate import BagStateSpec, TimerSpec, on_timer
from apache_beam.coders import VarIntCoder, StrUtf8Coder
from apache_beam.transforms.timeutil import TimeDomain

class DeduplicateEvents(beam.DoFn):
    """
    Deduplicate events within a time window using stateful processing.
    Keeps track of seen event IDs and clears them after a timeout.
    """

    # State spec to store seen event IDs
    SEEN_IDS = BagStateSpec("seen_ids", StrUtf8Coder())

    # Timer to clear state periodically
    CLEAR_TIMER = TimerSpec("clear_timer", TimeDomain.PROCESSING_TIME)

    def __init__(self, dedup_window_seconds=3600):
        self.dedup_window_seconds = dedup_window_seconds

    def process(
        self,
        element,
        seen_ids=beam.DoFn.StateParam(SEEN_IDS),
        clear_timer=beam.DoFn.TimerParam(CLEAR_TIMER),
    ):
        """Process an element, emitting only if not seen before."""
        event_id = element["event_id"]

        # Check if we have already seen this event
        existing_ids = set(seen_ids.read())

        if event_id not in existing_ids:
            # New event - emit it and record the ID
            seen_ids.add(event_id)
            clear_timer.set(
                beam.utils.timestamp.Timestamp.now().micros // 1000000
                + self.dedup_window_seconds
            )
            yield element

    @on_timer(CLEAR_TIMER)
    def clear_state(self, seen_ids=beam.DoFn.StateParam(SEEN_IDS)):
        """Clear the seen IDs state when the timer fires."""
        seen_ids.clear()
```

## Building Composite PTransforms

Composite transforms bundle multiple steps into a reusable unit. This is the best way to create shareable, testable pipeline components.

```python
# composite_transforms.py
# Reusable composite transforms that encapsulate multi-step logic
import apache_beam as beam
import json
from datetime import datetime

class ParseAndValidateJSON(beam.PTransform):
    """
    Composite transform that parses JSON strings, validates required fields,
    and routes valid/invalid records to separate outputs.
    """

    def __init__(self, required_fields, label=None):
        super().__init__(label)
        self.required_fields = required_fields

    def expand(self, pcoll):
        """Define the composite transform's pipeline graph."""

        def parse_json(line):
            try:
                return {"status": "ok", "data": json.loads(line)}
            except json.JSONDecodeError as e:
                return {"status": "error", "raw": line, "error": str(e)}

        def validate_fields(record, required_fields):
            if record["status"] == "error":
                yield beam.pvalue.TaggedOutput("invalid", record)
                return

            data = record["data"]
            missing = [f for f in required_fields if f not in data]

            if missing:
                yield beam.pvalue.TaggedOutput("invalid", {
                    "raw": data,
                    "error": f"Missing fields: {missing}",
                })
            else:
                yield beam.pvalue.TaggedOutput("valid", data)

        results = (
            pcoll
            | "ParseJSON" >> beam.Map(parse_json)
            | "ValidateFields" >> beam.FlatMap(
                validate_fields,
                required_fields=self.required_fields,
            ).with_outputs("valid", "invalid")
        )

        return results


class AggregateByTimeWindow(beam.PTransform):
    """
    Composite transform that windows data by time and computes aggregations.
    Works for both batch (using event timestamps) and streaming data.
    """

    def __init__(self, window_size_seconds, timestamp_field, value_field, label=None):
        super().__init__(label)
        self.window_size_seconds = window_size_seconds
        self.timestamp_field = timestamp_field
        self.value_field = value_field

    def expand(self, pcoll):
        def extract_timestamp(record):
            """Extract the event timestamp for windowing."""
            ts = datetime.fromisoformat(record[self.timestamp_field])
            return beam.window.TimestampedValue(record, ts.timestamp())

        def format_window_result(element, window=beam.DoFn.WindowParam):
            """Format the aggregation result with window boundaries."""
            key, values = element
            values_list = list(values)
            return {
                "key": key,
                "window_start": window.start.to_utc_datetime().isoformat(),
                "window_end": window.end.to_utc_datetime().isoformat(),
                "count": len(values_list),
                "total": sum(v[self.value_field] for v in values_list),
                "average": sum(v[self.value_field] for v in values_list) / len(values_list),
            }

        return (
            pcoll
            | "AddTimestamps" >> beam.Map(extract_timestamp)
            | "Window" >> beam.WindowInto(
                beam.window.FixedWindows(self.window_size_seconds)
            )
            | "KeyByCategory" >> beam.Map(lambda x: (x.get("category", "unknown"), x))
            | "GroupByKey" >> beam.GroupByKey()
            | "Aggregate" >> beam.ParDo(format_window_result)
        )
```

## Using Composite Transforms in a Pipeline

```python
# pipeline.py
# Full pipeline using custom composite transforms
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

options = PipelineOptions(
    runner="DataflowRunner",
    project="my-project",
    region="us-central1",
    temp_location="gs://my-bucket/temp",
    streaming=False,
)

with beam.Pipeline(options=options) as pipeline:
    # Use the ParseAndValidateJSON composite transform
    results = (
        pipeline
        | "ReadInput" >> beam.io.ReadFromText("gs://my-bucket/events/*.jsonl")
        | "ParseAndValidate" >> ParseAndValidateJSON(
            required_fields=["event_id", "timestamp", "category", "value"]
        )
    )

    # Process valid records through the aggregation transform
    (
        results["valid"]
        | "AggregateByWindow" >> AggregateByTimeWindow(
            window_size_seconds=3600,
            timestamp_field="timestamp",
            value_field="value",
        )
        | "FormatOutput" >> beam.Map(json.dumps)
        | "WriteAggregated" >> beam.io.WriteToText("gs://my-bucket/aggregated/")
    )

    # Write invalid records for investigation
    (
        results["invalid"]
        | "FormatInvalid" >> beam.Map(json.dumps)
        | "WriteInvalid" >> beam.io.WriteToText("gs://my-bucket/invalid/")
    )
```

## Testing Custom Transforms

Always test your transforms locally before deploying to Dataflow:

```python
# test_transforms.py
# Unit tests for custom Beam transforms
import apache_beam as beam
from apache_beam.testing.test_pipeline import TestPipeline
from apache_beam.testing.util import assert_that, equal_to
import json

def test_parse_and_validate():
    """Test the ParseAndValidateJSON composite transform."""
    with TestPipeline() as p:
        input_data = [
            '{"event_id": "1", "timestamp": "2026-02-17", "category": "web", "value": 10}',
            '{"event_id": "2"}',  # Missing fields
            'not valid json',      # Parse error
        ]

        results = (
            p
            | beam.Create(input_data)
            | ParseAndValidateJSON(
                required_fields=["event_id", "timestamp", "category", "value"]
            )
        )

        # Check that valid records contain the expected data
        assert_that(
            results["valid"],
            equal_to([{
                "event_id": "1",
                "timestamp": "2026-02-17",
                "category": "web",
                "value": 10,
            }]),
            label="ValidRecords",
        )

        # Check that we got 2 invalid records
        assert_that(
            results["invalid"] | beam.combiners.Count.Globally(),
            equal_to([2]),
            label="InvalidCount",
        )
```

## Summary

Custom Apache Beam transforms let you encapsulate your business logic into reusable, testable pipeline components. Start with simple functions for straightforward mappings, move to DoFn classes when you need setup/teardown, state, or multiple outputs, and wrap related operations into composite PTransforms for reusability. The key to good custom transforms is making them self-contained - they should handle their own error routing, resource management, and serialization. Test them locally with TestPipeline before deploying to Dataflow, and use tagged outputs to separate success and failure paths cleanly.
