# Validation Summary: How to Attribute Token Costs Across a Tree of Sub-Agent Calls

## Status
validated

## Post Type
Technical guide with a standalone Python accounting example.

## Technologies Covered
- Python 3 and the standard-library `decimal.Decimal` type
- AI agent invocation trees and provider-attempt cost attribution
- OpenTelemetry spans, attributes, links, sampling, and telemetry delivery
- Provider token-usage categories, retries, and prompt caching
- Metric label cardinality and durable usage ledgers

## Sources Consulted
- Python decimal documentation: https://docs.python.org/3/library/decimal.html — decimal construction from strings, currency arithmetic, precision, and rounding.
- OpenTelemetry Python instrumentation: https://opentelemetry.io/docs/languages/python/instrumentation/ — nested spans and application attributes; the post's documentation link resolves correctly.
- OpenTelemetry traces: https://opentelemetry.io/docs/concepts/signals/traces/ — trace and parent relationships, span context, and links.
- OpenTelemetry sampling: https://opentelemetry.io/docs/concepts/sampling/ — sampling means trace data need not represent every execution.
- OTLP specification: https://opentelemetry.io/docs/specs/otlp/ — delivery retries can produce duplicate telemetry.
- LangSmith cost tracking: https://docs.langchain.com/langsmith/cost-tracking — trace-level and parent-run aggregation of usage and costs.
- Anthropic prompt caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching — distinct input, cache-write, and cache-read usage fields illustrate why provider categories must be interpreted before summing them.
- Anthropic API billing: https://support.claude.com/en/articles/8977456-how-do-i-pay-for-my-claude-api-usage — a client disconnect or timeout can still leave a charged request.
- Prometheus metric and label naming: https://prometheus.io/docs/practices/naming/ — unbounded identifiers should not be metric labels.
- Author profile: https://github.com/nawazdhandala — the post's www.github.com author URL redirects to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post contains no terminal commands, configuration snippets, pinned package versions, or actual model prices requiring correction.
- Extracted and executed the Python code directly from README.md. Its three supplied assertions passed: root direct cost is USD 0.010, root inclusive cost is USD 0.035, and research inclusive cost is USD 0.025.
- Ten review checks passed: the original example; two sibling calls; two separately identified billable attempts; an empty request list; duplicate attempt rejection; unknown-owner rejection; missing-parent rejection; self-cycle rejection; a two-node cycle; and rejection of a missing amount supplied as None.
- The sibling and distinct-attempt fixtures verified that the sum of root inclusive totals equals the sum of unique request charges. The sibling check validates aggregation independently of execution order; it does not exercise concurrent ledger writes.
- Duplicate delivery is deliberately rejected by this aggregation function. Idempotent ingestion or deduplication must occur before aggregation, consistent with the surrounding guidance.
- Missing usage is not represented by the known-charge example. An empty request list yields zero known cost; it cannot establish whether usage is complete. Production code needs the separately described usage status and unknown-usage count. Passing None raises TypeError rather than silently treating an unknown amount as zero.
- Decimal arithmetic uses a finite precision context (28 significant digits by default). The example's amounts are exact within that context; production systems should select adequate precision and contract-specific rounding.
- The function validates ancestry even for calls with zero direct cost. It also accepts a forest of valid roots; each root total covers only its own descendants. Shared-work allocation is correctly described as a separate policy outside this tree example.
- Provider billing outcomes are provider-specific. The post appropriately says retries can be billable and advises reconciliation rather than assuming that every failed attempt is either charged or free.
