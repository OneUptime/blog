# How to Trace Input and Output Guardrails in Azure and AWS RAG Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, Guardrails, Azure, Amazon Bedrock, Observability

Description: Trace input, retrieved-context, and output guardrails across Azure and Amazon Bedrock without conflating provider decisions or missing enforcement.

A RAG answer passes through several policy boundaries: user input, retrieved content, model invocation, and answer release. When Azure and AWS services are combined, a single `guardrail_passed` flag hides which boundary was checked and which decision actually prevented delivery.

Use an application trace that preserves provider-specific evidence and normalizes only the operational facts your team needs. Azure annotations and Bedrock assessments are different contracts; translating both into one boolean loses important information.

## Name each intervention point

Define a stable application-level sequence:

| Stage | Content evaluated | Enforcement point |
|---|---|---|
| User input | Current user request | Before retrieval or model invocation |
| Retrieved context | Selected document versions | Before prompt assembly or dispatch |
| Model input | Final assembled request | At the configured model integration |
| Model output | Generated answer | Before release to the caller |
| Tool authorization | Proposed operation and arguments | Before external side effects |

The last row is not a content classifier. An acceptable sentence can still request an unauthorized operation, so tool authorization needs its own decision.

Record whether a stage was `evaluated`, `skipped_by_policy`, `unsupported`, or `error`. An absent annotation should not automatically become `allow`. Attach policy version, provider, input-reference ID, and an opaque decision ID to each evaluation.

## Trace explicit Bedrock calls

Amazon Bedrock's `ApplyGuardrail` evaluates content independently of a foundation-model invocation. This allows a separate input check before retrieval and another check on the generated output. [Using ApplyGuardrail in an application](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-independent-api.html).

The following adapter fragment expects a configured Boto3 `bedrock-runtime` client and an existing published guardrail version. It deliberately treats every intervention as a stop; applications that support anonymization need a more detailed decision adapter:

```python
def evaluate_bedrock(client, guardrail_id, version, text, phase):
    if phase not in {"INPUT", "OUTPUT"}:
        raise ValueError("unsupported evaluation phase")
    response = client.apply_guardrail(
        guardrailIdentifier=guardrail_id,
        guardrailVersion=version,
        source=phase,
        content=[{"text": {"text": text}}],
    )
    action = response.get("action")
    if action not in {"NONE", "GUARDRAIL_INTERVENED"}:
        raise RuntimeError("unknown guardrail decision")
    return {
        "provider": "aws-bedrock",
        "phase": phase,
        "decision": "allow" if action == "NONE" else "stop",
        "guardrail_version": version,
    }
```

The API returns assessments and can include matched sensitive text. Export only approved decision metadata to ordinary telemetry. If your application accepts anonymized output, use the returned transformed content according to the response contract and verify it reaches the next stage; never proceed with the original text merely because the call succeeded. [ApplyGuardrail API reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ApplyGuardrail.html).

Time the explicit API call locally. If you also record provider processing latency, label it separately from network, queueing, and retry time. Preserve one attempt record per retry and one final application decision.

## Trace Azure decisions at the correct boundary

Azure OpenAI Chat Completions can return prompt-filter and completion-filter annotations. The REST reference describes category details separately from whether filtering occurred. Store both the evaluation result and the application's handling of it. [Azure OpenAI Chat REST reference](https://learn.microsoft.com/en-us/rest/api/microsoft-foundry/azureopenai/chat).

Integrated filtering happens inside the provider request. You can attach the result to the model-call span, but cannot infer the internal filter's duration by subtracting unrelated timestamps. Use a separate duration only when the API actually supplies one or you explicitly invoke a separate service.

For independent document scanning, Azure AI Content Safety Prompt Shields accepts document content and returns attack-detection results. Your application remains responsible for excluding, blocking, or reviewing a document when using that API. [Prompt Shields integration behavior](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/concepts/jailbreak-detection).

Keep SDK and API-family adapters separate. A Chat Completions annotation parser should not silently handle Responses events as if they had the same shape. Store a safe parser status and test representative payloads when upgrading either integration.

## Record release, not just evaluation

A post-model check is effective only if its result controls delivery. Record `output_evaluated`, `output_released`, and `release_blocked` events with the same output-reference ID. If content changes after evaluation, the earlier decision no longer describes the released bytes.

Streaming needs an explicit release contract. Azure asynchronous filtering can deliver text before its corresponding annotations. A trace must therefore distinguish generated, displayed, and subsequently flagged content; an eventual block does not mean nothing reached the client. [Azure OpenAI streaming-filter behavior](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/content-streaming?view=foundry-classic).

For strict release policies, buffer content until the required checks complete, including the final segment. Measure that buffering separately from model generation and detector execution.

## Test the entire policy path

Use synthetic fixtures to exercise an allowed request, an input block, a rejected retrieved document, an output block, a detector timeout, and a missing annotation. Assert both the decision and its consequence: the provider must not be invoked after a blocking pre-check, and rejected output must not reach the response writer.

Report per-stage evaluation coverage, intervention rate, errors, and release latency. Keep provider and policy version as bounded dimensions and use trace IDs for detailed investigation. The useful operational question is whether the intended content was checked and the resulting decision was enforced at the right point.
