# How to Verify That PII Redaction Runs on Every Outbound LLM Request Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, PII, Security, Testing

Description: Verify outbound LLM redaction coverage with a request-path inventory, provider-boundary capture, retry tests, and fail-closed behavior.

Calling a redactor in your main chat handler does not establish that every model request is sanitized. A retry helper, background summary job, fallback provider, or tool continuation can assemble and send a different payload. Verify redaction at the last boundary you control before the provider receives content.

Coverage and detection accuracy are separate questions. First prove that every applicable path uses the policy. Then measure whether the policy recognizes the sensitive data your application handles.

## Enumerate actual outbound paths

Create a table of callers and payload components. Include interactive chat, streaming chat, embeddings, summarization, scheduled jobs, batch submissions, agent continuations, evaluation jobs, and fallback providers. Multimodal uploads need explicit handling; a text detector does not inspect an image or audio file automatically.

For each path, identify where the final request is assembled. Retrieval and tool results frequently introduce new content after the user message was cleaned. Apply the outbound policy to the complete provider payload, including conversation history and tool output, or prove that every constituent has passed the policy and cannot change afterward.

Your system might intentionally permit certain data at an approved provider. Encode that decision by destination and data class. Do not describe all authorized transmission as a redaction failure, and do not use the telemetry redaction policy as a substitute for an outbound policy.

## Funnel requests through a controlled adapter

The following runnable Python example demonstrates boundary placement with a synthetic marker. It is deliberately not a real PII detector:

```python
import copy
import json

MARKER = "SYNTHETIC_PRIVATE_VALUE"

class RecordingTransport:
    def __init__(self):
        self.sent = []

    def send(self, payload):
        self.sent.append(copy.deepcopy(payload))
        return {"status": "ok"}

def sanitize_fixture(value):
    if isinstance(value, str):
        return value.replace(MARKER, "[REMOVED]")
    if isinstance(value, list):
        return [sanitize_fixture(item) for item in value]
    if isinstance(value, dict):
        return {key: sanitize_fixture(item) for key, item in value.items()}
    return value

def send_to_provider(payload, transport, sanitize):
    cleaned = sanitize(copy.deepcopy(payload))  # Failure prevents send.
    return transport.send(cleaned)

transport = RecordingTransport()
for path in ("chat", "summary", "tool-continuation", "fallback"):
    payload = {"messages": [{"role": "user", "content": MARKER}]}
    send_to_provider(payload, transport, sanitize_fixture)
assert len(transport.sent) == 4
assert MARKER not in json.dumps(transport.sent)

before = len(transport.sent)
def broken_detector(_payload):
    raise RuntimeError("fixture detector unavailable")
try:
    send_to_provider({"messages": []}, transport, broken_detector)
except RuntimeError:
    pass
assert len(transport.sent) == before
```

The test demonstrates that a sanitizer failure prevents this adapter from sending. It does not prove that your application routes its real handlers through this function. Wire the recording transport into each production handler under test and invoke the handler itself. Capture the serialized HTTP body as well when SDK serialization or middleware can add content afterward.

The recursive fixture only handles values, not dictionary keys, files, or binary content. A production adapter must validate its accepted schema, forbid user-controlled field names where unnecessary, and define unsupported-payload behavior explicitly.

## Exercise bypass and failure scenarios

Test a retry after a timeout and a fallback after a rate-limit response. Check every attempt, not only the final successful one. If retries reuse an immutable sanitized request, verify that property; if they rebuild the prompt, require another policy pass.

Inject sensitive fixtures through earlier assistant messages, retrieved chunks, nested tool results, and user-provided metadata. Test streaming and non-streaming modes separately. A streaming response still starts with an outbound request whose input can be checked before transmission.

For background workers, verify the production entry point and queue consumer configuration. A unit test against the HTTP route cannot cover another process. A network policy or centralized egress proxy can help prevent direct provider access outside the approved adapter, but its routing coverage also needs testing.

## Measure detector quality independently

With Presidio, the analyzer identifies entity spans and the anonymizer transforms detected spans. Supported recognizers, language models, and configuration affect coverage. Review the actual entity and language setup instead of treating a successful function call as proof of sanitization. [Presidio Analyzer concepts](https://presidio.dataprivacystack.org/analyzer/).

Keep a labeled synthetic corpus of domain-specific identifiers, ordinary names, unusual spacing, multilingual text, and benign lookalikes. Report missed entities and unnecessary removals separately. Automated PII detection is imperfect, so architectural limits on which fields may leave remain valuable. [Presidio limitations](https://data-privacy-stack.github.io/presidio/).

## Define a release gate

Require all inventoried request paths to pass their outbound capture tests, with zero unsanitized synthetic markers. Report the number of paths tested and missing paths explicitly. Add a separate quality threshold for the labeled detector corpus.

In production, emit a bounded policy version and decision state such as `applied`, `blocked`, or `unsupported`. An `applied` counter is evidence that code ran, not evidence that all PII was found. Investigate provider traffic without a corresponding adapter decision, and rerun the coverage suite whenever a new SDK client, transport, worker, or fallback route is introduced.
