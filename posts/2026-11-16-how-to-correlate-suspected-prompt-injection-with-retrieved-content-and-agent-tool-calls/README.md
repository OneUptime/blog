# How to Trace Suspected Prompt Injection Through Retrieval and Agent Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, RAG, Security, Observability

Description: Connect suspicious retrieved content to prompt assembly, proposed tool calls, authorization decisions, and external outcomes without mistaking correlation for proof.

A prompt-injection alert becomes useful when it answers two questions: did the suspicious content reach the model, and did the agent attempt an action outside the user's authorized task? A detector score by itself answers neither. Build a trace that connects retrieval provenance to the exact model invocation and then to the application's tool execution boundary.

Keep investigation content access-controlled. Documents containing hostile instructions remain untrusted evidence even when viewed in an analyst tool or replay harness.

## Preserve the retrieval-to-prompt relationship

Assign each retrieved chunk an opaque ID and immutable document version. Record retrieval rank, rerank position, selection status, and the model-call ID that consumed it. A retrieved chunk that was discarded before prompt assembly should not be described as model exposure.

Store the content in a restricted evidence system if your data policy permits it. Shared traces can contain references, content length, and a keyed digest for integrity checking. An ordinary hash does not make a short or predictable secret anonymous, and even pseudonymous identifiers need access controls.

A practical trace sequence is:

```text
agent.run
  retrieval.search -> candidate chunk IDs
  prompt.assemble -> included chunk IDs and document versions
  model.invoke -> model-call ID
  tool.propose -> tool-call ID and safe argument summary
  tool.authorize -> allow, deny, or review
  tool.execute -> external operation ID
  tool.verify -> observed external state
```

These names are an application schema, not standardized provider event names. Preserve parent-child relationships where execution is synchronous; use explicit IDs or trace links when work crosses queues or resumes later.

## Separate detection from provenance

Azure Prompt Shields distinguishes analysis of user prompts from analysis of documents. Its documentation states that the service does not independently verify provenance; the application supplies that context. It also distinguishes attack-pattern detection from factuality, grounding, and task alignment. [Azure AI Content Safety Prompt Shields](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/concepts/jailbreak-detection).

Record which detector examined which content version, its policy version, outcome, and whether the content was excluded. A detector result attached only to the overall conversation cannot tell you which of twenty retrieved documents triggered it.

If text is transformed before prompting, preserve the relationship between original and transformed chunk IDs. Otherwise an analyst might examine a suspicious source passage that never appeared in the actual request.

## Correlate with attempted actions

Create a compact event record like this synthetic example:

```json
{
  "run_id": "run-042",
  "model_call_id": "model-03",
  "included_chunk_ids": ["chunk-17", "chunk-22"],
  "suspicious_chunk_ids": ["chunk-22"],
  "tool_call_id": "tool-09",
  "tool_name": "publish_report",
  "authorization": "denied",
  "reason_code": "destination_outside_task_scope",
  "external_effect": "none_observed"
}
```

Tool arguments are evidence, not authority. Validate the requested resource, destination, and operation against the authenticated user's task and current permissions. Keep that authorization check outside the model. Record the decision even when execution is denied; blocked attempts are valuable signals.

Do not label every tool call following a suspicious chunk as an attack success. The user might have independently requested that action. Compare the proposal to a structured task authorization record, approved destinations, and required confirmations. A legitimate run can contain malicious text without following it.

## Require outcome evidence

Distinguish `proposed`, `authorized`, `executed`, and `verified`. An API call can time out after creating an external effect, while a tool can return success without completing the intended change. Reconcile uncertain operations using an idempotency key or external operation ID and a readback where supported.

For example, if the authorized task was to summarize an internal report, a proposal to publish it externally is suspicious even when blocked. If it was executed, inspect the destination's audit trail and actual object state. Describe an uncertain outcome as unknown until evidence resolves it.

Independent audit systems help corroborate the agent's own trace. AWS Secrets Manager records API activity in CloudTrail, which can reveal a credential-access attempt associated with the runtime identity. That evidence establishes an API event, not what the model intended. [Secrets Manager CloudTrail logging](https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-cloudtrail.html).

## Investigate with controlled comparisons

Reproduce in an isolated environment with synthetic data and disabled real side effects. Keep the original retrieved version, prompt template, model configuration, and tool schema fixed. Compare runs with the suspect chunk included, removed, and replaced by a benign equivalent. Repeat comparisons because model behavior can vary.

These experiments strengthen or weaken a causal hypothesis; a single changed answer is not proof. Also examine whether unrelated prompt-size changes, retrieval ordering, or cached context altered behavior. Preserve the original run separately from replay results.

## Alert on consequential combinations

Prioritize combinations such as suspicious content reaching the model plus a denied credential read, an unapproved destination, or a proposed permission change. Route detector-only events to a lower-noise review queue unless policy requires immediate blocking.

Monitor missing provenance and missing authorization events as coverage failures. A clean detector result cannot compensate for a tool that executes without application authorization. The investigation should finish with a supported account of exposure, attempted action, enforcement, and observed effect, with uncertainties recorded at each stage.
