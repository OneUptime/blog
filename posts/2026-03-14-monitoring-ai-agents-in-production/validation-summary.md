# Validation Summary: Monitoring AI Agents in Production: The Observability Gap Nobody's Talking About

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AI agents and LLM-based systems
- Observability and production monitoring
- Prometheus alerting rules and PromQL
- Python async route handlers
- Flask health check endpoints
- JSON structured logging
- Distributed tracing and OpenTelemetry concepts

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus metric types tutorial: https://prometheus.io/docs/tutorials/understanding_metric_types/
- Flask async/await documentation: https://flask.palletsprojects.com/en/stable/async-await/
- OpenTelemetry traces documentation: https://opentelemetry.io/docs/concepts/signals/traces/
- OpenTelemetry GenAI semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/
- OpenTelemetry GenAI span semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OpenAI evaluation best practices: https://platform.openai.com/docs/guides/evaluation-best-practices

## Issues Found
- The Prometheus alert expression compared `rate(agent_tokens_total[5m])`, a per-second counter rate, to `avg_over_time(agent_tokens_total[24h])`, the average raw counter value over 24 hours. Changed the comparison to use `avg_over_time(rate(agent_tokens_total[5m])[24h:5m])`, so both sides compare token burn rates and follow Prometheus guidance to apply `rate()` before `_over_time` aggregation for counters.

## Review Notes
The Python health check snippet is illustrative and parses successfully, but depends on application-specific objects such as `llm`, `agent`, `budget`, and `check_all_tools`. Current Flask documentation supports `async def` route handlers when Flask is installed with async support. The JSON structured log example parses successfully. Local `promtool` was not installed in the review environment, so the PromQL review was performed against official Prometheus documentation rather than local parser output.
