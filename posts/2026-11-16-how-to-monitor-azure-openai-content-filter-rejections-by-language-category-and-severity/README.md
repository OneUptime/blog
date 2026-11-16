# How to Monitor Azure OpenAI Filter Rejections by Language and Severity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure OpenAI, Monitoring, Guardrails, Observability

Description: Normalize Azure OpenAI Chat Completions filter outcomes and monitor rejection rates by language, category, severity, and evaluation coverage.

A rise in Azure OpenAI rejections for one language can come from a traffic change, a filter-policy change, missing annotations, or different classifier behavior. Start with comparable denominators and a parser that distinguishes blocked input, filtered output, and evaluation failures. A dashboard counting every HTTP 400 as a safety rejection will mislead you.

This article uses Chat Completions terminology and the Azure v1 Chat schema. Responses and other API families need their own adapters and fixtures.

## Separate the observable outcomes

An input filtered by policy can return an HTTP 400 with the `content_filter` error code. Output filtering can appear on an otherwise successful response with a choice's `finish_reason` set to `content_filter`. Record those as different outcomes; other 400 errors may indicate malformed requests. [Azure content-filter response scenarios](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/content-filter).

Maintain bounded states such as `input_blocked`, `output_filtered`, `completed`, `provider_error`, `filter_error`, and `unknown`. A refusal written by the model is also distinct from a provider content-filter rejection. Do not infer the latter by matching wording in the answer.

For multi-choice responses, retain the choice index. For monitoring request-level failures, count a request once even if multiple categories or choices are filtered. Category-level charts can count several findings for the same request, so their totals need not equal the request total.

## Normalize category results without inventing missing data

Azure's Chat reference defines the four severity-based categories `hate`, `sexual`, `violence`, and `self_harm`, with `safe`, `low`, `medium`, and `high` severity values. Additional binary detection categories use a different shape. Keep those separate instead of assigning a fabricated severity. [Azure OpenAI Chat annotation schema](https://learn.microsoft.com/en-us/rest/api/microsoft-foundry/azureopenai/chat).

This runnable normalizer consumes a category-results object already extracted by an API-specific adapter:

```python
CATEGORIES = ("hate", "sexual", "violence", "self_harm")
SEVERITIES = {"safe", "low", "medium", "high"}

def category_rows(results, phase):
    rows = []
    for category in CATEGORIES:
        item = results.get(category)
        valid = (
            isinstance(item, dict)
            and isinstance(item.get("filtered"), bool)
            and isinstance(item.get("severity"), str)
            and item.get("severity") in SEVERITIES
        )
        rows.append({
            "phase": phase,
            "category": category,
            "evaluated": valid,
            "filtered": item["filtered"] if valid else None,
            "severity": item["severity"] if valid else "unknown",
        })
    return rows

fixture = {"violence": {"filtered": True, "severity": "medium"}}
rows = category_rows(fixture, "input")
assert sum(row["evaluated"] for row in rows) == 1
assert rows[0]["severity"] == "unknown"
assert rows[2]["filtered"] is True
print(rows)
```

For successful Chat responses, extract prompt results from `prompt_filter_results` and output results from the relevant choice. Error envelopes and streaming messages need dedicated extraction logic for the API version you deploy. Preserve a safe reason code for malformed or absent fields and test those cases rather than defaulting them to `safe`.

Do not log the complete error payload to debug a parser: it may contain sensitive content. Store a redacted fixture in an access-controlled test dataset when necessary.

## Define language independently

Content-filter severity is not a language label. Obtain language from an explicit application locale or a separately measured language detector, and record which source you used. A UI locale may differ from the prompt language, especially when users paste documents.

Use an allowlisted language vocabulary with `mixed` and `unknown` buckets. For output charts, distinguish requested language from detected output language if the distinction matters. Avoid logging raw text or arbitrary user-supplied locale strings as metric labels.

Compare each language against its own recent baseline and comparable task types. A support workflow discussing injuries can legitimately have different category distributions from a code-completion workflow. A higher rejection rate alone does not establish a false-positive problem.

## Publish rates and coverage together

For input blocking, divide blocked requests by all eligible requests in the language slice. For output filtering, use requests that reached generation. Also publish category evaluation coverage: requests with a usable category result divided by requests where that result was expected.

Include deployment, API family, filter configuration version, and streaming mode. Keep high-cardinality request IDs in traces, not metric labels. A deployment roll-out that changes the traffic mix can otherwise resemble a language regression.

Streaming annotations can arrive separately from text and may cover overlapping ranges. Accumulate request-level category evidence and count the final request once. Handle termination, cancellation, and delayed annotations explicitly. Azure's streaming documentation describes the distinction between buffered and asynchronous filtering. [Azure OpenAI content streaming](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/content-streaming?view=foundry-classic).

## Investigate a language-specific spike

First compare request volume, task distribution, policy version, and parser coverage. Then review a privacy-approved sample of rejected and allowed cases with qualified speakers using the same application policy. Record false blocks and missed violations separately.

Run a multilingual holdout corpus through the unchanged deployment and proposed configuration. Include mixed-language and quoted-content cases. If a policy adjustment reduces false blocks, check that it does not increase unacceptable outputs in another slice.

Alert when rejection rates change with enough volume to be meaningful, and separately when annotation coverage drops or filter errors rise. The actionable result is a supported diagnosis of policy, data, integration, or language behavior rather than a single aggregate percentage.
