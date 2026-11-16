# Validation Summary: How to Detect Prompt Cache Invalidation with Per-Step Agent Latency Metrics

## Status
validated

## Post Type
Technical guide covering per-attempt observability and prompt-cache troubleshooting.

## Technologies Covered
- OpenAI Responses API and prompt cache diagnostics
- LLM prompt caching, cache usage, and input billing
- Streaming response events and first-text latency
- Agent workflow telemetry and controlled performance comparisons
- JSON application records and keyed request fingerprints

## Sources Consulted
- OpenAI prompt caching guide: https://developers.openai.com/api/docs/guides/prompt-caching
- OpenAI cache-affecting settings: https://developers.openai.com/api/docs/guides/prompt-caching#which-settings-affect-the-cached-prefix
- OpenAI cache usage and billing calculations: https://developers.openai.com/api/docs/guides/prompt-caching#monitor-cache-performance
- OpenAI prompt cache diagnostics guide: https://developers.openai.com/api/docs/guides/prompt-caching/diagnostics
- OpenAI latency optimization guide: https://developers.openai.com/api/docs/guides/latency-optimization

## Issues Found
No technical issues found.

## Review Notes
- The post contains concrete API implementation details and a JSON example, so it qualifies for technical validation. The README was left unchanged.
- Parsed the JSON example successfully. Its names are explicitly application-defined, not a claimed API response schema; the example fingerprint is a placeholder. Keeping unavailable usage as null is appropriate.
- Confirmed the comparison request parameter, response diagnostics field, streaming completion-event location, and tools_changed diagnostic reason against the official diagnostics guide. The comparison does not supply conversation history or change cache behavior.
- Confirmed that unavailable diagnostics and expired comparison records do not establish a hit, and that diagnostic token estimates differ from reported usage. Diagnostics are currently documented for GPT-5.6 and later supported Responses API models; the post appropriately qualifies availability.
- Confirmed prefix sensitivity to tool ordering, earlier input, model selection, formatting settings, and compaction. A request change can prevent prefix reuse without deleting a cache entry. Matching content also requires eligible cache boundaries and model-specific minimum lengths.
- Checked the ratio example: 8,000 cached tokens out of 10,000 is 80%; out of 20,000 it is 40%. This does not establish loss of the earlier reused tokens.
- Confirmed that billing can partition input into ordinary input, cached reads, and cache writes. Writes must not automatically be counted again as an additive fee on all input.
- The latency recommendations align with official guidance to measure first text separately from completion, group comparable workloads, and record usage alongside timing. For tool-only or failed attempts with no text, implementations should preserve a missing first-text measurement and the attempt outcome.
- Fingerprints support application-side change detection; they do not reproduce the provider's full rendered context or prove physical cache eviction. The post appropriately labels conclusions without provider diagnostics as inference and cautions against treating hashes as access control.
- Both technical documentation links resolve to the intended official resources. The author profile link is attribution, not technical evidence. There are no CLI commands or executable API programs to test, and no live model requests were made. Controlled-run and alert recommendations are operational guidance, not guaranteed performance results.
