# Validation Summary: Your AI Agents Are Running Blind

## Status
validated

## Post Type
Technical opinion / observability guide

## Technologies Covered
- AI agents
- LLM-based automation
- Observability and monitoring
- Distributed tracing
- OpenTelemetry-style traces, spans, attributes, events, and metrics
- Jaeger and Zipkin
- SRE production monitoring practices

## Sources Consulted
- OpenTelemetry: Semantic conventions for generative AI systems, including GenAI events, exceptions, metrics, model spans, and agent spans: https://opentelemetry.io/docs/specs/semconv/gen-ai/
- OpenTelemetry: Traces, spans, span attributes, span events, and trace exporters: https://opentelemetry.io/docs/concepts/signals/traces/
- NIST AI Risk Management Framework overview, including AI risk management and generative AI profile references: https://www.nist.gov/itl/ai-risk-management-framework
- Google SRE Book, Chapter 6: Monitoring Distributed Systems, including monitoring definitions and the four golden signals: https://sre.google/sre-book/monitoring-distributed-systems/

## Issues Found
- The opening incident was presented as a factual event but did not include a verifiable source. I changed it to an illustrative realistic failure mode so the post does not assert an unverified production incident as fact.
- The claim that "over 60% of production infrastructure changes in 2026" would involve AI-driven automation was not supported by an authoritative source. I replaced it with a qualitative trend statement that preserves the point without inventing a precise statistic.
- The post implied agents never fail through ordinary service errors. I changed this to "don't always throw 500s" because agents can fail through both conventional runtime errors and higher-level incorrect actions.
- The post stated that all agents learn and adapt. I changed this to note that some agents learn/adapt, while others change behavior because of prompts, tools, model versions, retrieval data, or operating context.
- The post implied Jaeger or Zipkin cannot carry decision-related trace data. I changed this to clarify that the missing piece is agent-specific instrumentation, not necessarily the tracing backend, which aligns with OpenTelemetry's support for spans, attributes, events, metrics, and GenAI semantic conventions.
- References to reasoning chains and confidence scores were too absolute. I qualified them as available only when the system exposes a rationale, decision summary, confidence, or uncertainty signal.

## Review Notes
The post is technically relevant and broadly aligned with current observability guidance. OpenTelemetry's GenAI semantic conventions are still marked as development-stage, so future updates should revisit exact terminology if the conventions stabilize or change.
