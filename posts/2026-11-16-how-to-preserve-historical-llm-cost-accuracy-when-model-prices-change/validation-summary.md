# Validation Summary: How to Preserve Historical LLM Cost Accuracy When Model Prices Change

## Status

validated

## Post Type

Technical guide with an executable Python example.

## Technologies Covered

- Python: dataclasses, datetime, timezone, Decimal, and union type annotations.
- LLM token metering and OpenAI API pricing dimensions.
- Effective-dated rate catalogs, versioned calculations, and bitemporal history.
- Idempotent result persistence and composite unique keys.
- Azure Cost Management estimates and billing reconciliation.

## Sources Consulted

- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing): input, output, cached input, service tiers, regional pricing, modalities, and additional billing units.
- [OpenAI Chat Completions API reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create): actual service tier in responses and missing final usage chunks when streams are interrupted.
- [Python datetime documentation](https://docs.python.org/3/library/datetime.html): awareness requires a non-None UTC offset; aware timestamp comparison and UTC timezone support.
- [Python decimal documentation](https://docs.python.org/3/library/decimal.html): exact decimal representation, construction from strings, arithmetic precision, and rounding.
- [Python dataclasses documentation](https://docs.python.org/3/library/dataclasses.html): generated initialization and frozen records.
- [PEP 604](https://peps.python.org/pep-0604/): union annotations such as datetime | None, introduced in Python 3.10.
- [PostgreSQL constraints documentation](https://www.postgresql.org/docs/current/ddl-constraints.html): composite uniqueness and non-null identifiers.
- [Martin Fowler: Bitemporal History](https://martinfowler.com/articles/bitemporal-history.html): effective history, recorded history, retroactive corrections, and append-only records.
- [Azure: Understand Cost Management data](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data): processing delays and estimated costs before invoicing.
- [Author GitHub profile](https://github.com/nawazdhandala): confirmed the article's www.github.com author link redirects to the intended profile.

## Issues Found

1. Incomplete timestamp-awareness validation. Checking only occurred_at.tzinfo is None misses a datetime whose custom tzinfo returns None from utcoffset(). Reproduced the resulting TypeError during rate comparison. Changed the guard to occurred_at.utcoffset() is None, which rejects both forms of naive datetime with the intended ValueError.
2. Idempotency was stated as an automatic consequence of storing usage ID and pricing revision. Those fields alone do not prevent duplicate persisted results. Updated the sentence to require a non-null unique key on the pair and reuse of the existing result on retries.

## Review Notes

- Executed the extracted Python example on Python 3.15.0; both published assertions passed. The union annotation requires Python 3.10 or later. No deprecated APIs were found.
- Additional executable checks passed for the microsecond before the price boundary, the exact boundary, equivalent instants in another timezone, zero tokens, negative tokens, ordinary naive datetimes, custom tzinfo without an offset, missing rates, and overlapping rates.
- Verified that pricing a past event uses its historical interval independently of ingestion time. An isolated corrected-catalog check produced the replacement amount while the original result remained available; restoring the original catalog reproduced the original amount. The example has no database or reporting layer, so persistence, concurrent retry handling, and report revision retention were assessed as design guidance, not integration-tested.
- The fictional rates and sample results are arithmetically correct: 1,000 tokens at 2.00 per million costs 0.002, and at 1.50 costs 0.0015. Decimal precision and aggregation-level rounding guidance are accurate.
- Half-open intervals avoid double selection at adjacent boundaries; missing and overlapping entries are explicitly rejected. Production selection still requires the complete meter identity and the intended catalog revision.
- Preserving usage, price provenance, effective and recorded time, corrections, unknown usage, and separate simulation results is consistent with reproducible historical accounting. The article correctly defers billing-time semantics to each provider rather than asserting a universal rule.
- OpenAI documentation supports the multi-dimensional pricing claim and the warning about missing streamed usage. Azure documentation supports treating pre-invoice figures as estimates and reconciling separately.
- All external article links resolved to the intended resources. There are no terminal commands or configuration snippets to validate. Changes to README.md were limited to the two technical corrections above.
