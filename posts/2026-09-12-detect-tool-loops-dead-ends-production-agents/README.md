# Detect Tool-Call Loops, Dead Ends, and Repeated Agent Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, LangGraph

Description: Detect repeated agent actions using progress signals, argument fingerprints, execution budgets, and trace evidence that separates retries from loops.

An agent can return successful tool responses for several minutes without getting closer to the user's goal. Availability metrics stay green while token usage and latency rise. A production loop detector therefore needs to observe progress, not just exceptions.

Treat each tool call as an action with a reason, a bounded identity, and an observed effect. Then compare the sequence with the task's completion condition.

## Define a Loop More Carefully Than Repetition

Repeating a read-only search may be legitimate when the query changes. Polling a job may be legitimate while its state advances. Retrying a timed-out write may be unsafe even if its arguments are identical, because the first attempt could have committed remotely.

Use several signals together: repeated normalized arguments, unchanged results, unchanged task state, growing step count, repeated planner decisions, and elapsed time. Set separate limits for total actions, provider attempts, wall-clock duration, and money spent.

LangGraph has a recursion limit that bounds graph super-steps. It is a final execution guard, not a precise count of model calls or tools, because parallel nodes can run in the same super-step. [LangGraph graph API](https://docs.langchain.com/oss/python/langgraph/graph-api).

## Record an Action Ledger

For each action, retain the tool name, logical action ID, attempt number, argument fingerprint, result class, progress marker, and elapsed time. Keep raw arguments out of general telemetry unless your capture policy explicitly allows them.

An argument fingerprint should cover the values that determine behavior. Remove volatile fields such as request timestamps only when they are irrelevant to tool semantics. A time range in a search request is meaningful and should not be discarded just to make repeated actions easier to detect.

Here is a small per-run detector. The caller supplies a canonical argument fingerprint and an application progress marker. A marker could be a completed task count or a revision of the agent's structured plan.

```python
from collections import Counter


class LoopGuard:
    def __init__(self, repeat_limit=3, action_limit=20):
        self.repeat_limit = repeat_limit
        self.action_limit = action_limit
        self.actions = 0
        self.progress = None
        self.seen = Counter()

    def observe(self, tool, argument_fingerprint, progress_marker):
        self.actions += 1
        if progress_marker != self.progress:
            self.progress = progress_marker
            self.seen.clear()
        key = (tool, argument_fingerprint)
        self.seen[key] += 1
        if self.actions > self.action_limit:
            return "action_budget_exhausted"
        if self.seen[key] >= self.repeat_limit:
            return "repeated_action_without_progress"
        return None
```

Create a new guard for each logical task. Call it before dispatching another action and record the result on the agent span. For concurrent actions, serialize the decision or protect the guard with a lock; its mutable counters are not a distributed coordination mechanism.

This is a policy example, not a universal proof of a loop. A marker that changes every iteration defeats the detector, while an overly coarse marker blocks legitimate work. Design markers around externally meaningful progress.

## Distinguish Three Failure Patterns

A direct loop repeats the same tool and arguments without new evidence. An oscillation alternates between actions, such as changing a configuration and then reverting it. A dead end stops making useful calls while still generating explanations or repeatedly returning an empty result.

The counter above catches repeated actions within a progress interval, including some oscillations, but it does not detect every dead end. Add a deadline since the last meaningful progress event and a completion predicate independent of the language model's assertion that it is finished.

For a support agent, completion might mean a valid answer with required evidence or an explicit escalation. For an operational agent, completion may require verifying the intended external state. A final message saying "completed" is not equivalent to that verification.

## Stop with a Recoverable Outcome

When a guard trips, emit a terminal reason such as `loop_detected`, `no_progress_timeout`, or `action_budget_exhausted`. Record the relevant action IDs and recent bounded fingerprints. Stop scheduling further actions and provide a useful explanation or escalation path.

Do not blindly restart the entire agent after a loop. That can repeat side effects and double the cost. Resume from a checkpoint only when the tool actions are idempotent or their prior effects have been reconciled. LangGraph documents that nodes can re-execute during durable workflows, which makes idempotency part of the tool design. [Durable execution](https://docs.langchain.com/oss/python/langgraph/durable-execution).

Keep provider retries distinct from agent actions. Three HTTP retries for one tool invocation are one logical action with three attempts. Otherwise a transient network issue can look like a planning loop, and a real loop can disappear into a retry aggregate.

## Validate with Controlled Sequences

Run fixtures for repeated searches, alternating actions, a slow job that advances, a job that never advances, and a write whose result is unknown. Confirm both the terminal reason and the action where the guard fires.

Track the guard's false-positive rate through reviewed examples. Compare successful completion rate and cost before and after enabling it. A detector that reduces spend by blocking useful tasks needs a different threshold or progress definition.

Alert on a sustained rise in loop outcomes for a prompt or agent version. Preserve representative traces, including a small sample of successful long tasks, so engineers can distinguish a regression from a legitimate change in workload.

## Conclusion

Detect loops by combining repeated action identity with meaningful progress and explicit budgets. Trace the logical action and its retries separately, and make stopping a recoverable application outcome.

## Official Documentation

- [LangGraph graph API and recursion limits](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [LangGraph durable execution](https://docs.langchain.com/oss/python/langgraph/durable-execution)
- [OpenTelemetry Python events and attributes](https://opentelemetry.io/docs/languages/python/instrumentation/)
