# Validation Summary: How to Preserve Tool Outputs and Model Inputs for Replaying Failed Agent Runs

## Status
validated

## Post Type
Technical guide with a Python replay adapter and an illustrative JSON artifact manifest.

## Technologies Covered
- Large language models and tool-calling agents
- LangGraph checkpointing, state history, and time travel
- Python standard-library JSON serialization and deep copying
- Replay fixtures, tracing, and observability
- Versioned artifact storage and external side-effect isolation

## Sources Consulted
- LangGraph time travel: https://docs.langchain.com/oss/python/langgraph/use-time-travel — checkpoint replay and subsequent node execution.
- LangGraph checkpointers: https://docs.langchain.com/oss/python/langgraph/checkpointers — super-step snapshots, state history, checkpoint configuration, and namespaces.
- Python JSON documentation: https://docs.python.org/3/library/json.html — serialization, sorted dictionary keys, and supported input types.
- Python copy documentation: https://docs.python.org/3/library/copy.html — recursive copying of returned fixture values.
- Claude glossary: https://platform.claude.com/docs/en/about-claude/glossary — model outputs can vary for identical inputs, including at zero temperature.
- Claude model IDs and versioning: https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions — model identifiers, aliases, and versioning.
- OpenAI Chat API reference: https://developers.openai.com/api/reference/resources/chat — model messages, tool-call structures, response formats, and backend configuration metadata.
- OpenTelemetry GenAI conventions relocation notice and current repository: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/ and https://github.com/open-telemetry/semantic-conventions-genai — contextual observability references; the post does not depend on specific semantic-convention attributes.
- Author profile link: https://github.com/nawazdhandala — confirmed that the post's www.github.com URL resolves to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. Both linked LangGraph documentation pages resolve to the intended resources.
- Executed the exact Python code block using Python 3.15.0. Checks passed for matching calls with reordered dictionary keys, rejection of changed tool names/versions/arguments without advancing the fixture position, exhausted fixtures, unused fixtures, empty fixture lists, nested output mutation isolation, and repeated identical calls returning their respective recorded outputs in order.
- Parsed the JSON example successfully. Its schema, artifact identifiers, mode, and write-policy flag are application-defined, not built-in LangGraph settings. Application code must enforce the write policy.
- Confirmed that historical checkpoint replay can execute model and API calls again. Checkpoints preserve graph state rather than automatically archiving every raw boundary payload. Continuing unfinished work after a failure has distinct resume semantics; the linked documentation describes these separately.
- The adapter is intentionally sequential and assumes JSON-compatible arguments. Sorted-key serialization is suitable for this example, but is not a general cross-language canonicalization scheme for arbitrary Python objects.
- Exception reproduction, artifact retrieval, digest verification, parallel-branch matching, and network isolation are requirements discussed in the prose, not implemented by this small adapter. A production integration must route effectful operations through its replay controls and reproduce error outcomes explicitly.
- The parser/model/workflow replay categories are explanatory terminology, not claims about named LangGraph APIs. Deterministic parser replay requires deterministic parser and validation dependencies; the post appropriately states that it can be deterministic.
- Storage access controls, transformation labels, separate replay identities, and retention policies are architectural guidance. No terminal commands or framework-specific configuration snippets require additional validation, and the code uses no deprecated APIs.
- No live provider calls, database writes, or full LangGraph workflow executions were performed. Runtime validation covered the standalone adapter and manifest; framework behavior was checked against official documentation.
