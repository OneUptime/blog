# How to Use Local-First OpenTelemetry Capture for AI Coding Agent Debugging Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, AI Coding Agents, Debugging, Local Development, Observability

Description: Capture and analyze OpenTelemetry traces locally to debug issues in AI coding agent workflows like LLM calls and tool invocations.

AI coding agents make multiple LLM calls, use tools, read files, and execute commands in a chain of operations. When something goes wrong, figuring out where the chain broke is hard without visibility into each step. OpenTelemetry gives you that visibility by tracing every operation the agent performs. This post shows how to set up local trace capture for AI agent debugging.

## Why Trace AI Coding Agents

An AI coding agent might perform these steps to complete a task:
1. Read a file to understand context
2. Make an LLM call with the file contents
3. Parse the LLM response
4. Execute a tool (run tests, search code, write files)
5. Make another LLM call with the tool results
6. Generate the final output

If the agent produces a wrong answer, which step failed? Was the context insufficient? Did the LLM misinterpret the prompt? Did a tool return unexpected results? Traces answer these questions by recording each step with its inputs, outputs, and timing.

## Setting Up Local Trace Capture

Use a minimal local setup: an OpenTelemetry Collector writing to a file, plus a console viewer. No cloud backend needed.

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  file:
    path: /tmp/agent-traces.jsonl
    flush_interval: 1s

  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [file, debug]
```

Start the collector:

```bash
docker run --rm -p 4318:4318 \
  -v $(pwd)/collector-config.yaml:/etc/otelcol/config.yaml \
  -v /tmp:/tmp \
  otel/opentelemetry-collector-contrib:latest
```

Traces are written to `/tmp/agent-traces.jsonl` as newline-delimited JSON. You can also watch them in the collector's stdout with the debug exporter.

## Instrumenting the Agent

Here is a Python example showing how to instrument an AI coding agent. The key is to create spans for each distinct operation:

```python
# agent_tracing.py
import os
import json
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({
    "service.name": "ai-coding-agent",
    "agent.version": "0.1.0",
})

provider = TracerProvider(resource=resource)
exporter = OTLPSpanExporter(
    endpoint=os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318") + "/v1/traces"
)
# Use SimpleSpanProcessor so spans export immediately
provider.add_span_processor(SimpleSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("ai-coding-agent")
```

Now instrument each agent operation:

```python
# agent.py
import openai
from agent_tracing import tracer
from opentelemetry import trace

class CodingAgent:
    def __init__(self, model="gpt-4"):
        self.model = model
        self.client = openai.OpenAI()

    def run_task(self, task_description):
        """Execute a coding task with full tracing."""
        with tracer.start_as_current_span("agent.run_task") as root_span:
            root_span.set_attribute("task.description", task_description[:200])

            # Step 1: Gather context
            context = self._gather_context(task_description)

            # Step 2: Plan the approach
            plan = self._create_plan(task_description, context)

            # Step 3: Execute the plan
            result = self._execute_plan(plan)

            root_span.set_attribute("task.status", "completed")
            return result

    def _gather_context(self, task):
        with tracer.start_as_current_span("agent.gather_context") as span:
            # Read relevant files
            files = self._find_relevant_files(task)
            span.set_attribute("context.files_found", len(files))

            contents = {}
            for f in files:
                with tracer.start_as_current_span("agent.read_file") as file_span:
                    file_span.set_attribute("file.path", f)
                    try:
                        with open(f) as fh:
                            contents[f] = fh.read()
                        file_span.set_attribute("file.size_bytes", len(contents[f]))
                    except Exception as e:
                        file_span.set_attribute("error", True)
                        file_span.record_exception(e)

            span.set_attribute("context.total_chars", sum(len(c) for c in contents.values()))
            return contents

    def _create_plan(self, task, context):
        with tracer.start_as_current_span("agent.create_plan") as span:
            prompt = f"Task: {task}\nContext:\n{json.dumps(list(context.keys()))}"
            span.set_attribute("llm.prompt_length", len(prompt))

            response = self._call_llm(prompt, purpose="planning")
            span.set_attribute("plan.steps", len(response.split("\n")))
            return response

    def _call_llm(self, prompt, purpose="general"):
        """Make an LLM call with detailed tracing."""
        with tracer.start_as_current_span("agent.llm_call") as span:
            span.set_attribute("llm.model", self.model)
            span.set_attribute("llm.purpose", purpose)
            span.set_attribute("llm.prompt_length", len(prompt))

            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                )

                result = response.choices[0].message.content
                span.set_attribute("llm.response_length", len(result))
                span.set_attribute("llm.tokens.prompt", response.usage.prompt_tokens)
                span.set_attribute("llm.tokens.completion", response.usage.completion_tokens)
                span.set_attribute("llm.tokens.total", response.usage.total_tokens)
                span.set_attribute("llm.finish_reason", response.choices[0].finish_reason)

                return result

            except Exception as e:
                span.set_attribute("error", True)
                span.record_exception(e)
                raise

    def _execute_plan(self, plan):
        with tracer.start_as_current_span("agent.execute_plan") as span:
            # Execute each step in the plan
            steps = [s.strip() for s in plan.split("\n") if s.strip()]
            span.set_attribute("plan.total_steps", len(steps))

            results = []
            for i, step in enumerate(steps):
                with tracer.start_as_current_span(f"agent.execute_step") as step_span:
                    step_span.set_attribute("step.index", i)
                    step_span.set_attribute("step.description", step[:100])
                    result = self._execute_single_step(step)
                    results.append(result)

            return results

    def _find_relevant_files(self, task):
        with tracer.start_as_current_span("agent.find_files") as span:
            # Simplified file finding logic
            files = ["src/main.py", "src/utils.py"]
            span.set_attribute("files.count", len(files))
            return files

    def _execute_single_step(self, step):
        # Placeholder for actual step execution
        return {"step": step, "status": "completed"}
```

## Analyzing Agent Traces

After running the agent, examine the traces. The file exporter writes to `/tmp/agent-traces.jsonl`. You can also view them in Jaeger if you add it to your collector config.

Look for these patterns:

**Slow LLM calls**: Sort spans by duration. If an LLM call takes 30 seconds, you might be sending too much context.

```bash
# Quick analysis of trace durations from the file
cat /tmp/agent-traces.jsonl | python3 -c "
import sys, json
for line in sys.stdin:
    data = json.loads(line)
    for rs in data.get('resourceSpans', []):
        for ss in rs.get('scopeSpans', []):
            for span in ss.get('spans', []):
                duration_ns = int(span['endTimeUnixNano']) - int(span['startTimeUnixNano'])
                duration_ms = duration_ns / 1_000_000
                print(f'{duration_ms:8.1f}ms  {span[\"name\"]}')" | sort -rn | head -20
```

**Token usage**: Check the `llm.tokens.total` attribute on LLM spans. High token counts mean high costs and slower responses.

**Error patterns**: Filter for spans with `error=True` to find where the agent fails. The recorded exceptions include stack traces.

**Context quality**: Look at `context.total_chars` to see how much context the agent gathered. Too little context leads to bad answers; too much leads to slow and expensive LLM calls.

## Iterating on the Agent

The trace data tells you exactly where to improve. If the planning step produces a bad plan, you can see the prompt that was sent and adjust it. If a tool execution fails, you can see the input and error. This is much faster than adding print statements throughout the agent code.

Local-first tracing keeps the feedback loop tight: run the agent, examine the traces, make a change, run again. No cloud latency, no cost per trace, and full control over your data.
