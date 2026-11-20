## Documentation review

Reviewed RFC 9110 Retry-After seconds/date syntax, Azure ARM throttling scope and wait behavior, AWS full-jitter and retry layering guidance, current AWS SDK retry configuration caveats, and Python date parsing. Sources are listed in validation.json.

## Local execution

Python 3.11.13 passed eighteen cases: jitter lower/upper bounds and cap; numeric/date server floors; past date; insufficient/exact request budget; malformed negative/fractional/text headers; invalid retry bounds, remaining budget, random sample and naive wall clock. Published helper matches tested code; example returns 120.5 and None. No sleep or network requests occurred. Mermaid structure has eight nodes and eight edges. Generated image was visually inspected for readability and clipping.

## Limitations

No cloud, SDK retry, distributed queue or limiter behavior was exercised. The helper does not classify errors, authorize retries, sleep, persist work or enforce a transport timeout; these integration responsibilities are explicit. SDK behavior is version/configuration dependent, including the documented 2026 opt-in distinction. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
