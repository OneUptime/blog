# Validation Summary: How to Monitor Azure OpenAI Filter Rejections by Language and Severity

## Status
validated

## Post Type
Technical monitoring guide with a runnable Python normalization example.

## Technologies Covered
- Azure OpenAI Chat Completions, including the Azure v1 Chat schema
- Content filtering categories, severity annotations, and filter errors
- Buffered and asynchronous streaming annotations
- Python dictionaries, type checks, and set membership
- Observability metrics, language segmentation, and evaluation coverage

## Sources Consulted
- Microsoft Learn, Azure OpenAI Chat REST reference (v1): https://learn.microsoft.com/en-us/rest/api/microsoft-foundry/azureopenai/chat
- Microsoft Learn, content filtering and response scenarios: https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/content-filter (redirects to https://learn.microsoft.com/en-us/azure/foundry-classic/foundry-models/concepts/content-filter)
- Microsoft Learn, content streaming and annotation examples: https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/content-streaming?view=foundry-classic
- Python documentation, built-in types and set membership: https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset
- Prometheus documentation, metric and label naming: https://prometheus.io/docs/practices/naming/
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
- The normalizer checked severity membership in a set without first checking its type. A malformed JSON array or object in `severity` raised `TypeError`, interrupting normalization instead of marking that category unknown. Reproduced the failure with an empty list. Added `isinstance(item.get("severity"), str)` before set membership so malformed values produce `evaluated=False`, `filtered=None`, and `severity="unknown"`. Python set semantics and the documented string severity values support this correction. No other technical corrections were needed.

## Review Notes
- Confirmed the distinction between prompt filtering with HTTP 400 and `content_filter`, output filtering through a choice's `finish_reason`, model refusals, and filter evaluation errors. Filter errors can coexist with an otherwise successful HTTP response.
- Confirmed the four severity-based categories and their severity values, and that binary detection results use a different schema.
- Checked the prompt and choice annotation extraction guidance against Microsoft's streaming examples. The normalizer deliberately consumes an already extracted category-results dictionary; it is not a complete response-envelope or streaming parser.
- Confirmed that asynchronous annotations can arrive after text and that multiple annotations can refer to the same tokens. Request-level deduplication and explicit handling of interrupted streams are appropriate monitoring recommendations.
- Reviewed rate denominators, category coverage, bounded language labels, deployment and policy context, and holdout evaluation guidance. These are application monitoring recommendations, not claims that Azure supplies language labels or these custom metric names automatically.
- The original Python fixture passed. After the fix, 23 additional checks passed, covering all four severities with both boolean filter values, invalid severity types and values, malformed category items, missing fields, and absent categories.
- All external links were checked. The older content-filter URL redirects to the relevant Microsoft Learn resource. No terminal commands, configuration snippets, or deprecated SDK calls appear in the post.
- Validation used official documentation and local Python execution; no live Azure deployment requests were performed. API-specific extraction and cancellation behavior still require integration fixtures for the deployed API family and version.
