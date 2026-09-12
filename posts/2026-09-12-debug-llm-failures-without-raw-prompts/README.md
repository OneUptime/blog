# Debug LLM Failures Without Raw Prompts: Hashes and Selective Capture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, Security

Description: Use template versions, keyed fingerprints, structural metadata, and controlled capture to debug LLM failures without routinely storing prompt text.

Raw prompts are convenient during debugging, but a production prompt can contain customer records, internal documents, credentials accidentally pasted by users, and tool results. Copying that material into a second system expands the places where it must be protected and deleted.

You can answer many operational questions without retaining the prompt itself. Start with version identity, structural metadata, outcomes, and carefully scoped fingerprints. Add content capture only when those signals cannot answer a specific diagnostic question.

## Decide What Must Be Reproducible

Separate structural reproducibility from content reproducibility. A template version, model ID, tool schema digest, and retrieval index revision can reproduce the software configuration. They cannot reconstruct private input that was never retained.

That limitation is useful to state explicitly. A hash lets you recognize repeated input within its scope; it does not reveal what the input was or prove why an answer was incorrect. For content-dependent failures, reproduce with user-provided or approved synthetic examples, or use a controlled capture workflow.

Record a compact manifest per attempt: template ID and immutable revision, model requested and resolved, application release, message and tool counts, estimated input size, retrieval count, content-capture state, and failure category. Keep the values bounded and avoid accidentally putting customer data into supposedly harmless metadata fields.

## Use Keyed Fingerprints for Correlation

A plain hash of a short prompt is vulnerable to guessing. An attacker who suspects likely input can hash those candidates and compare them. OpenTelemetry's sensitive-data guidance specifically notes the limitations of hashing predictable values. [Handling sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/).

A keyed HMAC makes offline guessing harder for someone who lacks the key. It still produces linkable pseudonymous data and must be protected accordingly. Use separate keys or scopes where cross-tenant matching is unnecessary.

```python
import hashlib
import hmac
import json


def prompt_fingerprint(messages, *, key, tenant_scope, key_id):
    envelope = {
        "schema": 1,
        "tenant_scope": tenant_scope,
        "messages": messages,
    }
    encoded = json.dumps(
        envelope, sort_keys=True, separators=(",", ":"),
        ensure_ascii=False, allow_nan=False,
    ).encode("utf-8")
    digest = hmac.new(key, encoded, hashlib.sha256).hexdigest()
    return {"fingerprint": digest, "fingerprint_key_id": key_id}
```

The function accepts JSON-compatible structured messages and key bytes supplied by your secret-management layer. Never log the key. Version the canonicalization scheme because changing message serialization changes the fingerprint even when visible text looks identical. Python documents HMAC as a keyed message authentication construction. [Python HMAC](https://docs.python.org/3/library/hmac.html).

Use a different fingerprint for the rendered context and the final prompt. Matching context with differing prompts points toward history, tools, or prompt construction. Matching prompts with differing outcomes points toward generation, provider behavior, or downstream processing, while still allowing for nondeterminism.

## Prevent Content from Entering Telemetry

Mask at the application or instrumentation boundary when the requirement is to keep raw content out of telemetry transport. Collector redaction happens later, after the data has already entered a telemetry process and possibly buffers.

LangSmith provides controls to hide or transform trace inputs and outputs. Langfuse also supports client-side masking. Review the exact fields covered, including nested observations and metadata, rather than assuming an input/output switch removes every possible content copy. [LangSmith sensitive data controls](https://docs.langchain.com/langsmith/mask-inputs-outputs), [Langfuse masking](https://langfuse.com/docs/observability/features/masking).

Audit exceptions, tool arguments, document URLs, and HTTP logs. A prompt excluded from model spans can still appear in a parser exception or a debug log. Use an allowlist for operational fields and test synthetic secret markers through the full pipeline.

## Make Selective Capture a Bounded Workflow

When content is necessary, define who can enable capture, which tenant and request class it covers, how long it lasts, and the maximum volume. Prefer a short-lived capture policy with an explicit expiry over a permanent debug environment variable.

Store captured content separately from broad operational metadata. Put an opaque capture ID on the trace and require stronger access to resolve it. Record who read or exported the content. Encrypt storage and backups, and make deletion include derived artifacts such as evaluation datasets.

Capture at the right stage. A retriever snapshot cannot prove the model input if context assembly truncates it later. If exact input is needed, capture the final structured messages plus the provider serialization boundary relevant to the bug.

## Test the Policy as a Data Flow

Create a synthetic marker and place it in a user message, tool result, document metadata, parser failure, and output. Exercise success, retry, exception, and streaming cancellation paths. Search the exported telemetry and backend views for that marker using your authorized test environment.

Verify that fingerprints remain stable for identical structured input, differ across tenant scopes, and change when a meaningful message field changes. Confirm key rotation behavior is intentional: different keys should produce different fingerprints, and historical comparisons should retain the key ID without retaining the key itself.

Finally, measure the fraction of incidents resolved from metadata alone. Use the remaining cases to improve structural fields or tightly scoped capture, rather than expanding raw logging for every request.

## Conclusion

Debugging without raw prompts depends on preserving configuration and structural evidence, not pretending a hash can reconstruct content. Keyed fingerprints and controlled capture give you useful correlation while keeping sensitive material out of routine telemetry.

## Official Documentation

- [OpenTelemetry handling sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/)
- [Python HMAC](https://docs.python.org/3/library/hmac.html)
- [LangSmith input and output masking](https://docs.langchain.com/langsmith/mask-inputs-outputs)
- [Langfuse masking](https://langfuse.com/docs/observability/features/masking)
