# Choose Langfuse, LangSmith, Phoenix, or OpenTelemetry for LLMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, LLM

Description: Compare LLM observability stacks by tracing, evaluation, deployment, privacy, and operational fit, then test each against the same production failure cases.

Choosing an LLM observability stack is partly an instrumentation decision and partly a workflow decision. You need to capture the application's behavior, but someone must also inspect failures, review answers, compare experiments, manage access, and operate the storage.

Langfuse, LangSmith, and Phoenix provide application-facing observability and evaluation workflows. OpenTelemetry provides vendor-neutral telemetry APIs, SDKs, conventions, and transport components. It is therefore a foundation that can participate in the other options, not simply another interchangeable dashboard.

## Compare Responsibilities Before Features

OpenTelemetry collects and exports telemetry; it does not itself provide a complete storage backend, trace UI, or an answer-review program. You choose compatible destinations and build or adopt the operational workflows around them. [What is OpenTelemetry?](https://opentelemetry.io/docs/what-is-opentelemetry/).

Langfuse provides LLM tracing and evaluation capabilities, including workflows around observations and scores. It offers managed hosting and self-hosting; some additional features require a license. [Langfuse observability](https://langfuse.com/docs/observability/overview), [Langfuse self-hosting](https://langfuse.com/self-hosting).

LangSmith provides tracing, feedback, datasets, and evaluation workflows, with direct integration into LangChain and LangGraph applications. Its current documentation makes self-hosting an Enterprise plan add-on and requires a license key, so confirm commercial eligibility alongside deployment requirements. [LangSmith observability](https://docs.langchain.com/langsmith/observability-concepts), [Self-hosted LangSmith](https://docs.langchain.com/langsmith/self-hosted).

Phoenix is an open-source AI observability and evaluation product that works with OpenTelemetry and OpenInference instrumentation. Its documentation distinguishes Phoenix from Arize's other products, so evaluate the deployment and SDK that actually match your choice. [Phoenix overview](https://arize.com/docs/phoenix), [Phoenix tracing tutorial](https://arize.com/docs/phoenix/tracing/tutorial).

## Use a Decision Matrix

The following matrix identifies what to investigate, rather than declaring one product universally best:

| Choice | Strong reason to evaluate it | Main question to prove |
|---|---|---|
| Langfuse | Integrated LLM tracing and evaluation with self-hosting options | Can your team operate its storage and enforce the required access model? |
| LangSmith | LangChain/LangGraph tracing and experiment workflows | Does it preserve your custom execution paths and fit deployment requirements? |
| Phoenix | Open-source AI tracing and evaluation with OpenInference | Do supported integrations capture your providers, tools, and retrieval semantics? |
| OpenTelemetry with a backend | Existing distributed tracing and cross-service operations | Who supplies LLM evaluation, prompt review, and feedback workflows? |

Do not interpret a row as exclusivity. Several products can ingest or export OpenTelemetry-compatible data, and an application may use one telemetry path for infrastructure operations and another interface for evaluation. Verify that combination rather than assuming matching protocols guarantee matching semantics.

## Run the Same Failure Scenario Everywhere

Use a small application with one HTTP entry point, retrieval, a custom tool, two concurrent model-related operations, and a fallback. Give it deterministic failure fixtures and a minimal synthetic dataset.

Test a successful answer, a provider timeout, a tool error, empty retrieval, an unsupported answer claim, streaming cancellation, and a queue handoff. The comparison should ask whether an engineer can identify the failing stage, not merely whether a root trace appears.

Inspect parent IDs, nested spans, first-content timing, final usage, missing-usage status, and request configuration versions. Confirm that retries are separate attempts and the request cost is not counted by multiple integrations.

Keep library versions in the comparison record. A missing span may reflect an unsupported provider version or initialization error rather than a permanent product limitation. Repeat the same fixture after upgrades before relying on historical conclusions.

## Evaluate the Human Workflow

Tracing and evaluation solve related but different tasks. Trace inspection explains one execution. Evaluation compares behavior across examples, versions, and populations.

Ask a reviewer to attach feedback to an exact answer, create a small dataset from approved failures, compare two prompt versions, and find the source trace for a bad result. Measure the steps and permissions required. A technically complete trace exporter may still leave these workflows expensive to build.

Define how quality labels remain comparable. Preserve evaluator model, rubric version, dataset revision, and source type. A score from a human reviewer should not silently replace a model-judge score under the same unlabeled field.

Also test export. Can you retrieve traces, scores, dataset references, and relevant identifiers in a usable form? Protocol compatibility reduces some migration work, but application metadata, prompt versions, annotations, and evaluation schemas still need mapping.

## Prove Privacy and Operations

Put a synthetic sensitive marker into prompts, tool outputs, metadata, and exceptions. Verify masking before transmission where required, then check the stored result. Test actual read and export permissions with a non-administrator account.

Confirm retention behavior for traces and derived datasets. Evaluate backup handling, deletion requests, ingestion credentials, content access auditing, and the boundary between projects or tenants. Feature availability can vary by deployment and plan, so use current official documentation and an actual account configuration rather than a remembered pricing table.

For self-hosting, estimate capacity from observed span count and payload size per request. Include databases, object storage, backups, upgrades, monitoring, and operational ownership. A local Docker demonstration does not prove high availability or production recovery.

For managed services, test ingestion latency, regional requirements, export limits, and what happens when the telemetry destination is unavailable. The application should follow an intentional buffering or failure policy rather than discover it during an incident.

## Choose the Smallest Complete Workflow

If your team already has strong distributed tracing, begin by proving that LLM spans can share request context with HTTP, database, and queue work. Add an evaluation interface where the existing backend does not meet reviewer needs.

If LangGraph is central and your team needs rapid trace-to-experiment iteration, evaluate LangSmith's native workflow first. If self-hosted LLM tracing and review are priorities, run the same fixture through Langfuse and Phoenix and compare the actual operating requirements.

These are starting hypotheses, not a ranking. Select the stack that passes your failure, privacy, and review cases with ownership your team can sustain.

## Conclusion

Choose by demonstrated workflow: correct traces, trustworthy accounting, useful evaluation, and enforceable data controls. Treat OpenTelemetry as a shared telemetry foundation and compare the products using the same application and failure fixtures.

## Official Documentation

- [OpenTelemetry overview](https://opentelemetry.io/docs/what-is-opentelemetry/)
- [Langfuse observability](https://langfuse.com/docs/observability/overview)
- [Langfuse evaluation](https://langfuse.com/docs/evaluation/overview)
- [Langfuse self-hosting](https://langfuse.com/self-hosting)
- [LangSmith observability concepts](https://docs.langchain.com/langsmith/observability-concepts)
- [LangSmith self-hosting](https://docs.langchain.com/langsmith/self-hosted)
- [Phoenix overview](https://arize.com/docs/phoenix)
- [Phoenix tracing tutorial](https://arize.com/docs/phoenix/tracing/tutorial)
