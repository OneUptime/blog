# Validation Summary: Your AI Agents Are Running Blind: The Agent Observability Gap

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- AI agent observability
- LangChain / LangSmith
- CrewAI
- AutoGen
- Prometheus
- OneUptime

## Sources Consulted
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry semantic conventions for generative AI systems: https://opentelemetry.io/docs/specs/semconv/gen-ai/
- AutoGen tracing and observability: https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tracing.html
- CrewAI OpenTelemetry export guide: https://docs.crewai.com/en/enterprise/guides/capture_telemetry_logs
- LangSmith trace with OpenTelemetry: https://docs.langchain.com/langsmith/trace-with-opentelemetry
- Prometheus histograms and summaries: https://prometheus.io/docs/practices/histograms/
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/telemetry/open-telemetry
- OneUptime traces product page: https://oneuptime.com/product/traces
- OneUptime metrics product page: https://oneuptime.com/product/metrics
- Author GitHub profile: https://github.com/mallersjamie
- OneUptime GitHub repository: https://github.com/OneUptime/oneuptime

## Issues Found
- The post described REST API behavior as deterministic and implied stack traces always identify failures exactly. I softened that wording to reflect that traditional API behavior is usually more bounded and easier to reason about, but not universally deterministic.
- The post said P99 latency metrics are "meaningless" for agentic systems. I changed this to "a lot less useful on their own" because latency quantiles are still valid metrics; they are just insufficient by themselves for agent workflows.
- The post said LangChain, CrewAI, and AutoGen were "starting to add" OTEL instrumentation. I updated this to reflect the current state of official docs: LangChain/LangSmith, CrewAI, and AutoGen already have documented OpenTelemetry support paths.

## Review Notes
- The Python example uses current OpenTelemetry tracing APIs and is syntactically valid.
- The sample span attributes are application-specific rather than OpenTelemetry GenAI semantic-convention keys. They are acceptable as illustrative custom attributes, but future revisions could align the example more closely with the GenAI semantic conventions.
- The YAML alert block is illustrative rather than a vendor-specific Prometheus or Alertmanager rule format. That is acceptable in context because no specific alerting engine is named.
