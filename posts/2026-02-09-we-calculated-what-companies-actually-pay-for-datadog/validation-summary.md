# Validation Summary: We Calculated What Companies Actually Pay for Datadog

## Status
validated

## Post Type
Technical analysis / pricing guide

## Technologies Covered
- Datadog Infrastructure Monitoring
- Datadog Container Monitoring
- Datadog APM
- Datadog Log Management
- Datadog Custom Metrics
- Datadog Synthetics
- Datadog RUM
- Kubernetes
- OpenTelemetry
- OneUptime

## Sources Consulted
- Datadog Billing documentation: https://docs.datadoghq.com/account_management/billing/
- Datadog Containers Billing documentation: https://docs.datadoghq.com/account_management/billing/containers/
- Datadog Custom Metrics Billing documentation: https://docs.datadoghq.com/account_management/billing/custom_metrics/
- Datadog APM Billing documentation: https://docs.datadoghq.com/account_management/billing/apm_tracing_profiler/
- Datadog Serverless Billing documentation: https://docs.datadoghq.com/account_management/billing/serverless/
- Datadog pricing list: https://www.datadoghq.com/pricing/list/
- Datadog billing pricing documentation for Synthetics and RUM: https://docs.datadoghq.com/account_management/billing/pricing/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- OpenTelemetry documentation: https://opentelemetry.io/docs/

## Issues Found
- Datadog log indexing was described as priced per GB. Updated the post to state that Datadog log ingestion is priced per GB, while standard log indexing is priced per million indexed log events with retention-specific rates.
- The initial pricing estimate used `15-day retention × 100GB × $1.70/GB`. Updated it to use `1B indexed log events × $1.70/1M events`.
- The Kubernetes infrastructure billing section said Datadog counts containers instead of nodes for infrastructure host billing. Updated it to state that Kubernetes nodes are infrastructure hosts and monitored containers above the included allowance are billed separately.
- The log explosion and log retention examples multiplied GB by a 15-day retention price. Reworked those examples around indexed event counts and noted that longer retention changes the indexed-event price or moves into custom/Flex retention terms.
- The custom metrics cardinality example said 5 tags with 10 values each but calculated only three tag dimensions. Updated the text to say 3 high-cardinality tags.
- The APM section said every container, Kubernetes pod, and serverless function sending traces is billed as an APM host. Updated it to distinguish non-Fargate underlying APM hosts from Fargate task billing, serverless active-function/traced-invocation billing, indexed spans, and ingested span volume.
- The calculator omitted container overages, span overages, indexed span pricing, and the custom metric allowance subtraction. Updated the calculator to include those dimensions and correct the custom metrics formula.
- The comparison table described Datadog host counting as per-container and open backend logs as storage-only. Updated it to reflect Datadog host plus container-overage billing and open backend storage plus compute costs.
- The Kubernetes command `kubectl get pods -A | wc -l` counted pods, not containers. Replaced it with a JSONPath command that counts regular containers across all pods.

## Review Notes
The post includes private survey and anecdotal invoice claims that cannot be independently verified from public documentation. They were left intact because they are presented as the author's collected data rather than vendor documentation claims.
