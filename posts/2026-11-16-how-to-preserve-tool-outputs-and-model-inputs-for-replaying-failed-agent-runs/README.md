# How to Preserve Tool Outputs and Model Inputs for Replaying Failed Agent Runs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, LangGraph, Tracing, Observability

Description: Capture versioned replay artifacts and inject recorded tool results so failed agent runs can be reproduced without repeating external side effects.

A trace that says a tool succeeded is useful for locating a failure, but it may not contain enough information to reproduce it. The database may have changed, the prompt template may have been edited, and the model alias may now resolve differently. Replaying the original user message can produce an entirely different run.

Preserve the inputs and outputs at important boundaries, then choose which parts of a replay are allowed to execute again. Diagnostic replay should make those choices explicit.

## Distinguish three replay modes

A parser replay feeds a saved model output into the same parser and validation code. A model replay sends the saved model input again and compares the new result. A workflow replay re-executes orchestration while substituting recorded tool or model responses where configured.

These answer different questions. Parser replay can be deterministic without any network access. Model replay can vary even with identical input. Workflow replay can reproduce control-flow defects while avoiding database or payment writes.

LangGraph's [time-travel guide](https://docs.langchain.com/oss/python/langgraph/use-time-travel) explains that resuming from a checkpoint re-executes subsequent nodes, including model calls and API requests. Checkpoint replay is not automatically an offline playback of recorded effects.

## Capture the rendered boundary inputs

For each model attempt, preserve the exact ordered messages or input items, tool definitions, response-format schema, model identifier, relevant generation settings, and application/prompt versions. Save the normalized model response and raw provider response when permitted and useful.

For each tool call, retain the tool name and version, canonical arguments, call ID, output, outcome, timing, and any external effect identifier. Capture both the original tool output and the transformed content sent to the model. A summarizer or truncation step may be where the defect occurred.

Store these payloads in a restricted artifact store and put references plus integrity digests in traces. Record redaction rules and schema versions. A redacted artifact can still support many investigations, but mark it as transformed so it is not mistaken for an exact reproduction.

A manifest might look like this:

```json
{
  "replay_schema": "agent-replay-v1",
  "original_run_id": "run-900",
  "application_revision": "source-commit-id",
  "prompt_revision": "support-v7",
  "model_input_ref": "artifact:model-input-3",
  "model_output_ref": "artifact:model-output-3",
  "tool_events_ref": "artifact:tool-events",
  "mode": "recorded-tools",
  "external_writes_allowed": false
}
```

The references are application-defined identifiers. Resolve them through authenticated storage access; they are not public URLs or instructions to a model.

## Fail closed when a fixture does not match

This small replay adapter consumes an ordered list of recorded tool results. It refuses unexpected calls rather than silently falling back to a live tool:

```python
import copy
import json

class RecordedTools:
    def __init__(self, records):
        self.records = list(records)
        self.position = 0

    def call(self, name, version, arguments):
        if self.position >= len(self.records):
            raise RuntimeError("Replay exhausted")
        recorded = self.records[self.position]
        actual = json.dumps([name, version, arguments], sort_keys=True)
        expected = json.dumps(
            [recorded["name"], recorded["version"], recorded["arguments"]],
            sort_keys=True,
        )
        if actual != expected:
            raise RuntimeError("Replay diverged before tool execution")
        self.position += 1
        return copy.deepcopy(recorded["output"])

    def assert_consumed(self):
        if self.position != len(self.records):
            raise RuntimeError("Replay ended with unused tool records")
```

This adapter assumes sequential tool calls. For parallel branches, match by a stable branch identity and occurrence number or recorded call ID, preserving the causal relationships. Matching only tool name and arguments is ambiguous when the same call legitimately occurs twice and returns different data.

Keep errors as first-class fixtures too. A timeout, permission denial, or malformed result can be the condition that triggers the bug. Returning a success fixture for every tool erases those paths.

## Combine artifacts with checkpoints

[LangGraph checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers) preserve graph state at super-step boundaries and expose state history. Save the checkpoint configuration and namespace alongside the replay manifest when using them.

A checkpoint does not necessarily contain a tool's full raw output if your application retained only a summary. It also does not replace dependency versions, prompt revisions, or external-state evidence. Use checkpoints to find the execution point and boundary artifacts to supply the missing reproduction data.

Prefer a new replay run ID linked to the original run. Keep replay traces and costs separate from production so a diagnostic exercise does not distort customer activity or workflow success reports.

## Verify the replay's guarantees

Start with the failing parser or node, then expand to the whole workflow only if needed. Confirm that fixture digests match, package versions are recorded, all expected fixtures are consumed, and unexpected external calls fail loudly.

Run a case that would perform a write in production and prove that the replay intercepts it. Test a missing artifact and a changed tool argument. A replay that silently substitutes current data is not a faithful test of the saved run.

Define retention and deletion policies for payload artifacts independently of trace retention. Preserve enough material to investigate failures, but do not collect every sensitive prompt indefinitely. A useful replay system makes its limits visible: what was recorded, what was transformed, what was re-executed, and which external effects were prevented.
