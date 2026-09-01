# How to Evaluate Tool-Calling Agents for Correct Tool Choice, Arguments, and Final Answers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AI Agents, Agent, Evaluation, Test Automation, LLM

Description: Test tool-calling agents at both trace and outcome levels, covering tool selection, arguments, ordering, side effects, and the final response.

---

A tool-calling agent can produce a plausible final sentence after taking the wrong action. It can also follow a different but valid tool path and still solve the task. An evaluation that checks only the response misses the first failure; one that demands one exact trace unfairly rejects the second.

Evaluate an agent at two levels: **what it did** and **what state it produced**. Trace-level checks cover tool necessity, selection, arguments, ordering, and use of results. Outcome-level checks cover the external state, user goal, and final answer.

## Define the Contract for Each Scenario

Each test case should include more than an input and expected prose:

```yaml
input: "Move tomorrow's 10:00 review to 11:00"
initial_state:
  events:
    - id: evt-42
      title: Review
      start: 2026-09-01T10:00:00+01:00
allowed_tools: [calendar_search, calendar_update]
required_outcome:
  event_id: evt-42
  start: 2026-09-01T11:00:00+01:00
forbidden_outcomes: [create_duplicate_event, modify_other_event]
final_answer_requirements: [confirm_new_time]
```

Add cases where no tool should be called, where clarification is required, where a tool returns an error, and where the requested action is forbidden. The agent's ability to refrain from acting is part of correctness.

Run mutating tools against a sandbox, emulator, or reversible fixture. Reset state between cases. A replayed test must not email a customer, charge a card, or alter a real calendar. Give every simulated write an idempotency key and record before-and-after state.

## Score Tool Choice and Arguments Separately

Tool-choice accuracy asks whether the selected capability matches the task. It should distinguish:

- required call made;
- required call omitted;
- unnecessary extra call;
- wrong tool with a superficially similar name;
- prohibited or unsafe call.

Arguments need field-aware comparison. Exact JSON equality is appropriate for identifiers and enumerations, but not always for equivalent timestamps or harmless object-key ordering. Normalize only semantics allowed by the tool contract:

```python
from datetime import datetime, timezone

def normalize_update(args):
    return {
        "event_id": args["event_id"],
        "start": datetime.fromisoformat(args["start"])
        .astimezone(timezone.utc)
        .isoformat(),
    }

argument_match = normalize_update(actual) == normalize_update(expected)
```

Do not use a semantic LLM judge to excuse an invalid schema, a missing required field, or the wrong account ID. Validate the schema first, compare strict safety-critical fields next, and reserve semantic comparison for genuinely open-ended values such as a search query. Provider-enforced strict function schemas can improve syntactic conformance, but they do not prove that the model selected the right tool or supplied semantically correct values.

For partial performance, report tool-call precision, recall, and F1. Precision penalizes extra distinct calls; recall penalizes missing expected calls. Ragas' current collections `ToolCallF1` converts predicted and reference calls to sets of `(tool name, arguments)` and matches those structures without considering order. Set conversion also collapses duplicate identical calls, so this metric cannot detect an accidental repeated write by itself.

The current `ToolCallAccuracy` implementation first requires the complete tool-name sequence to match, or the same sorted tool-name multiset when `strict_order=False`; a name or call-count mismatch makes the final score zero. When names align, its argument score is the fraction of **reference** keys whose stringified values match. Missing or wrong reference arguments lower the score. When the reference argument object is nonempty, additional predicted keys are not penalized by that function; when the reference has no arguments but the prediction does, it returns zero. This is why schema validation, duplicate-call checks, safety-critical type checks, and state assertions must remain separate. Both Ragas metrics are useful only when one reference call set represents all acceptable behavior; otherwise add alternative-reference or outcome-aware logic.

## Decide When Order Matters

Some dependencies are mandatory: search for an event before updating the returned ID, or obtain approval before submitting a purchase. Other calls, such as fetching weather for two cities, can run in either order.

Represent the expected workflow as constraints rather than one serialized transcript:

```text
calendar_search -> calendar_update
calendar_update must occur at most once
final response occurs after successful update
```

A partial-order checker can accept parallel independent calls while rejecting a write performed before its prerequisite. When multiple tools provide the same capability, define an allowed set or evaluate the resulting state instead of hard-coding one name.

## Verify Result Handling and the Final Answer

After a correct call, the agent may ignore the result, hallucinate success after an error, or expose sensitive tool output. Include assertions that the final answer:

- reflects the actual tool status and relevant returned values;
- does not claim success after a failed or unconfirmed write;
- communicates required IDs, times, limitations, or next steps;
- does not reveal hidden fields or secrets;
- answers the user's original goal rather than merely narrating calls.

Outcome assertions should inspect the sandbox state directly. For the calendar example, the strongest proof is that `evt-42` moved and no duplicate exists-not that the agent said “done.” Ragas distinguishes this outcome-oriented question through agent goal accuracy metrics, including a version with a reference outcome. Those judge metrics infer goal achievement or end state from the supplied conversation; they do not inspect your external sandbox, so they cannot replace direct state assertions. OpenAI trace grading similarly focuses on scoring decisions, calls, and reasoning steps within an agent trace.

## Build a Layered Scorecard

Avoid collapsing everything immediately into one average. A useful case report contains:

| Dimension | Example measure |
| --- | --- |
| Tool necessity | correct call or correct no-call |
| Tool selection | precision, recall, F1 |
| Arguments | schema validity and field accuracy |
| Workflow | dependency and side-effect violations |
| Outcome | required state achieved |
| Final answer | factual, complete, and safe |

Make irreversible side effects, cross-tenant access, and false success claims hard failures even if the other dimensions pass. Use softer aggregate scores for iteration, then explicit critical gates for release decisions.

Measure repeated runs because agent behavior can vary. Keep tool fixtures deterministic while measuring model variance, and log model version, prompts, tool schemas, tool responses, trace, final state, and grader version. Review failures by category; a rise in argument errors requires a different fix from a decline in final-answer completeness.

Finally, include adversarial tool results: malformed payloads, prompt injection in returned text, stale records, duplicate names, timeouts, and permission errors. Tool output is untrusted data, and a robust agent should not obey instructions embedded inside it.

## Official Documentation

- [OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling)
- [OpenAI Trace Grading](https://developers.openai.com/api/docs/guides/trace-grading)
- [OpenAI Evaluation Best Practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Ragas Agentic and Tool-Use Metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/agents/)
- [Ragas v0.4.3 collections `ToolCallF1` implementation](https://github.com/vibrantlabsai/ragas/blob/v0.4.3/src/ragas/metrics/collections/tool_call_f1/metric.py)
- [Ragas v0.4.3 collections `ToolCallAccuracy` implementation](https://github.com/vibrantlabsai/ragas/blob/v0.4.3/src/ragas/metrics/collections/tool_call_accuracy/metric.py)
- [Ragas v0.4.3 `ToolCallAccuracy` argument matching](https://github.com/vibrantlabsai/ragas/blob/v0.4.3/src/ragas/metrics/collections/tool_call_accuracy/util.py)

## Conclusion

An agent evaluation should prove both that the workflow was safe and that the user's goal was achieved. Validate schemas and critical arguments deterministically, allow genuinely equivalent traces, enforce ordering only where dependencies require it, inspect external state, and grade the final answer against real tool results. That combination catches dangerous false success without punishing valid alternative plans.
