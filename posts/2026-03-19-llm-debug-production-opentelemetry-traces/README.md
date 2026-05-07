# How to Use LLMs to Debug Production Issues from OpenTelemetry Traces

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, OpenTelemetry, AI, Debugging, Tracing

Description: A practical guide to feeding OpenTelemetry trace data into LLMs to accelerate root cause analysis, with code examples and prompt patterns that actually work.

Your traces have everything. The service that spiked, the database query that took 4 seconds instead of 40ms, the retry storm that cascaded across three microservices at 2am. The problem isn't data - it's that no human can parse 47 spans across 12 services fast enough when your on-call phone is buzzing.

That's where LLMs come in. Not as a magic "AI fixes everything" button, but as a surprisingly effective pattern-matching layer on top of structured trace data. Feed an LLM the right context from your OpenTelemetry traces, and it can surface root causes in seconds that would take an engineer 20 minutes of clicking through dashboards.

This post walks through how to build this yourself - extracting traces via the OpenTelemetry Collector, formatting them for LLM consumption, and writing prompts that produce useful debugging output. No vendor lock-in required.

## Why Traces Are the Best Signal for LLM-Assisted Debugging

Logs are noisy. Metrics show *that* something is wrong. Traces show *why*.

A distributed trace is inherently structured - it's a tree of operations with timing, status codes, attributes, and parent-child relationships. This structure makes traces far more useful as LLM input than raw logs, because:

1. **Traces carry causal relationships.** Span A called Span B which called Span C. If C failed, the trace shows the exact path that led there.
2. **Timing is built in.** You don't need to correlate timestamps across log files. The trace already knows that the database call took 3.8 seconds out of a 4.2-second total request.
3. **Attributes are typed.** `http.status_code: 503`, `db.statement: SELECT ...`, `rpc.grpc.status_code: UNAVAILABLE` - this is structured data an LLM can reason about directly.

## Step 1: Export Traces in a Format LLMs Can Read

The OpenTelemetry Collector can export trace data in multiple formats. For LLM consumption, JSON is the most practical choice. Configure a file exporter alongside your existing backend:

```yaml
# otel-collector-config.yaml
exporters:
  otlp:
    endpoint: "your-backend:4317"
  file/debug:
    path: /tmp/traces.jsonl
    format: json
    append: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp, file/debug]
```

For production use, you don't want to dump every trace to disk. Use a tail sampling processor to capture only interesting traces - errors, high latency, or specific services:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors-only
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow-requests
        type: latency
        latency:
          threshold_ms: 2000

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp, file/debug]
```

This gives you a targeted set of problematic traces ready for analysis.

## Step 2: Extract and Format a Single Trace for Analysis

Raw OTLP JSON is verbose, and collector exports are typically batches rather than single traces. LLMs work best when you trim the noise and present the essential structure. Here's a Python script that extracts one trace from an OTLP JSON batch and transforms it into a concise, readable format:

```python
import json

SPAN_KIND = {
    0: "UNSPECIFIED",
    1: "INTERNAL",
    2: "SERVER",
    3: "CLIENT",
    4: "PRODUCER",
    5: "CONSUMER",
}

SPAN_STATUS = {
    0: "UNSET",
    1: "OK",
    2: "ERROR",
}

def decode_any_value(value):
    """Decode an OTLP AnyValue object into a plain Python value."""
    for field in (
        "stringValue",
        "boolValue",
        "intValue",
        "doubleValue",
        "bytesValue",
        "arrayValue",
        "kvlistValue",
    ):
        if field in value:
            return value[field]
    return None

def format_trace_for_llm(traces_data, trace_id):
    """Extract one OTLP trace and convert it into a concise LLM-friendly format."""
    spans = []

    for resource_span in traces_data.get("resourceSpans", []):
        service_name = ""
        for attr in resource_span.get("resource", {}).get("attributes", []):
            if attr["key"] == "service.name":
                service_name = decode_any_value(attr["value"]) or ""

        for scope_span in resource_span.get("scopeSpans", []):
            for span in scope_span.get("spans", []):
                if span["traceId"] != trace_id:
                    continue

                formatted = {
                    "service": service_name,
                    "name": span["name"],
                    "kind": SPAN_KIND.get(span.get("kind", 1), "INTERNAL"),
                    "status": SPAN_STATUS.get(
                        span.get("status", {}).get("code", 0),
                        "UNSET",
                    ),
                    "duration_ms": (
                        int(span["endTimeUnixNano"]) -
                        int(span["startTimeUnixNano"])
                    ) / 1_000_000,
                    "attributes": {
                        attr["key"]: decode_any_value(attr["value"])
                        for attr in span.get("attributes", [])
                    },
                    "events": [
                        {
                            "name": event["name"],
                            "attributes": {
                                attr["key"]: decode_any_value(attr["value"])
                                for attr in event.get("attributes", [])
                            },
                        }
                        for event in span.get("events", [])
                    ],
                    "parent_span_id": span.get("parentSpanId") or None,
                    "span_id": span["spanId"],
                }
                spans.append((int(span["startTimeUnixNano"]), formatted))

    spans.sort(key=lambda item: item[0])
    return [span for _, span in spans]
```

The output looks something like this:

```json
[
  {
    "service": "api-gateway",
    "name": "POST /api/v1/orders",
    "status": "ERROR",
    "duration_ms": 4203,
    "attributes": {
      "http.status_code": "503",
      "http.method": "POST"
    },
    "events": [
      {
        "name": "exception",
        "attributes": {
          "exception.type": "ServiceUnavailableError",
          "exception.message": "upstream connect error"
        }
      }
    ]
  },
  {
    "service": "order-service",
    "name": "INSERT orders",
    "status": "ERROR",
    "duration_ms": 3812,
    "attributes": {
      "db.system": "postgresql",
      "db.statement": "INSERT INTO orders ..."
    }
  }
]
```

This is dense, structured, and exactly what an LLM needs.

## Step 3: Write Prompts That Produce Useful Output

The prompt matters more than the model. A vague "what's wrong with this trace?" gets you vague answers. Here's a prompt template that consistently produces actionable output:

```python
ANALYSIS_PROMPT = """You are an SRE analyzing a production incident. Below is a 
distributed trace from an OpenTelemetry-instrumented system that shows an error 
or performance issue.

TRACE DATA:
{trace_json}

Analyze this trace and provide:

1. ROOT CAUSE: What specific operation failed or degraded, and why? Be precise 
   about the service, operation, and error.

2. BLAST RADIUS: What upstream services were affected by this trace? Which
   request path failed as a result?

3. TIMELINE: Reconstruct what happened in chronological order, with durations.

4. RECOMMENDED FIX: Based on the error type and attributes, what should the 
   on-call engineer check first?

5. SIMILAR PATTERNS: Does this look like a known failure pattern (connection 
   pool exhaustion, cascade failure, retry storm, etc.)?

Be specific. Reference actual span names, service names, and attribute values 
from the trace. Do not speculate beyond what the data shows."""
```

A few things that make this prompt effective:

- **Role assignment** ("You are an SRE") focuses the model on operational analysis rather than academic explanations
- **Structured output sections** prevent rambling and make the response scannable during an incident
- **"Do not speculate beyond what the data shows"** reduces hallucination, which is critical when you're making decisions at 2am

## Step 4: Build an Automated Analysis Pipeline

Manually copying trace JSON into ChatGPT works for one-off debugging, but the real value comes from automation. Here's a minimal pipeline that watches for error traces and analyzes them automatically:

```python
import json
import os
import time
from openai import OpenAI
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

class TraceAnalyzer(FileSystemEventHandler):
    def __init__(self):
        self._offset = 0

    def on_modified(self, event):
        if event.is_directory or not event.src_path.endswith("traces.jsonl"):
            return

        with open(event.src_path) as f:
            if self._offset > os.path.getsize(event.src_path):
                self._offset = 0

            f.seek(self._offset)

            while True:
                line_offset = f.tell()
                line = f.readline()

                if not line:
                    break

                # Wait for the collector to finish writing the current JSONL record.
                if not line.endswith("\n"):
                    f.seek(line_offset)
                    break

                traces_data = json.loads(line)
                for trace_id in self._error_trace_ids(traces_data):
                    analysis = self._analyze(traces_data, trace_id)
                    self._send_to_slack(trace_id, analysis)

            self._offset = f.tell()

    def _error_trace_ids(self, traces_data):
        trace_ids = set()

        for rs in traces_data.get("resourceSpans", []):
            for ss in rs.get("scopeSpans", []):
                for span in ss.get("spans", []):
                    status = span.get("status", {})
                    if status.get("code") == 2:  # STATUS_CODE_ERROR
                        trace_ids.add(span["traceId"])

        return trace_ids

    def _analyze(self, traces_data, trace_id):
        formatted = format_trace_for_llm(traces_data, trace_id)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": ANALYSIS_PROMPT.format(
                        trace_json=json.dumps(formatted, indent=2)
                    ),
                }
            ],
            temperature=0.1  # Low temperature for factual analysis
        )
        return response.choices[0].message.content

    def _send_to_slack(self, trace_id, analysis):
        # Send the trace ID and analysis to your incident channel
        pass

observer = Observer()
observer.schedule(TraceAnalyzer(), "/tmp/", recursive=False)
observer.start()

try:
    while True:
        time.sleep(1)
finally:
    observer.stop()
    observer.join()
```

You can swap `gpt-4o` for another chat-compatible model. Local models like Llama 3 work surprisingly well for this since the task is primarily pattern matching on structured data, not creative generation. If you're running open source infrastructure, keeping the LLM local means your trace data never leaves your network.

## Step 5: Enrich Traces with Context Before Analysis

Raw traces tell you what happened. Enriched traces help the LLM tell you *why it matters*. Add context from your system's topology:

```python
SERVICE_CONTEXT = {
    "api-gateway": {
        "tier": "critical",
        "dependencies": ["order-service", "auth-service", "inventory-service"],
        "sla": "99.95%",
        "team": "platform"
    },
    "order-service": {
        "tier": "critical", 
        "dependencies": ["postgresql", "redis", "inventory-service"],
        "sla": "99.9%",
        "team": "commerce"
    }
}

def enrich_trace(formatted_spans):
    """Add service context to formatted trace data."""
    enriched_prompt = "SERVICE TOPOLOGY:\n"
    services_in_trace = set(s["service"] for s in formatted_spans)
    
    for service in services_in_trace:
        if service in SERVICE_CONTEXT:
            ctx = SERVICE_CONTEXT[service]
            enriched_prompt += (
                f"- {service}: {ctx['tier']} tier, "
                f"SLA {ctx['sla']}, owned by {ctx['team']}\n"
            )
    
    enriched_prompt += f"\nTRACE DATA:\n{json.dumps(formatted_spans, indent=2)}"
    return enriched_prompt
```

With this context, the LLM can say "this failure in order-service puts the commerce team's 99.9% SLA at risk" instead of just "order-service returned an error."

## What Works, What Doesn't

After running this pattern across hundreds of production traces, here's what we've found:

**Works well:**
- Identifying the slowest span in a cascade and explaining why it matters
- Recognizing common failure patterns (N+1 queries, connection timeouts, retry storms)
- Suggesting what to check first based on error types
- Generating human-readable incident summaries from raw trace data

**Doesn't work well:**
- Predicting *future* failures from current traces
- Understanding business logic ("this order was rejected because the customer exceeded their credit limit")
- Replacing deep system knowledge for novel failure modes
- Working with truncated or incomplete traces

The sweet spot is augmentation, not replacement. The LLM handles the tedious work of parsing spans and spotting patterns, freeing the on-call engineer to focus on decisions and fixes.

## Using This with OneUptime

OneUptime's OpenTelemetry backend stores your trace data and accepts OTLP ingest. You can query traces via the API, pipe them through the formatting script above, and get LLM-powered analysis directly in your incident workflow. If you're self-hosting OneUptime, your trace data stays on your infrastructure - which matters when you're sending production data to an LLM.

The MCP (Model Context Protocol) server we recently shipped takes this further: it lets AI agents query your OneUptime traces, metrics, and logs directly. Instead of building a custom pipeline, the agent can pull the relevant trace, analyze it, and suggest a fix - all in one conversation.

## Getting Started

1. **Add a file exporter** to your OpenTelemetry Collector config to capture error traces
2. **Use the formatting script** to convert OTLP JSON into concise trace summaries
3. **Start with manual analysis** - paste formatted traces into your preferred LLM and iterate on the prompt
4. **Automate once the prompts are stable** - connect the pipeline to your alerting system
5. **Add service context** to improve the quality of root cause analysis

The gap between "something is broken" and "here's exactly what happened and what to do about it" is where most incident response time gets burned. LLMs won't close that gap entirely, but they can shrink it dramatically - especially when they're working with the structured, causal data that OpenTelemetry traces provide.
