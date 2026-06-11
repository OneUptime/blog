# Validation Summary: How to Implement Percentage Rollout Flags

## Status
validated

## Post Type
Tutorial / Guide — a practical implementation walkthrough covering both from-scratch hashing-based feature flag logic and integration with the LaunchDarkly and Unleash platforms.

## Technologies Covered
- Python (`hashlib`, `dataclasses`, `enum`)
- TypeScript / JavaScript (Node.js `crypto`)
- Go (`crypto/sha256`, `encoding/binary`)
- LaunchDarkly Python Server SDK (Context API, v8+)
- LaunchDarkly JavaScript Client SDK (v3.x, `LDContext`)
- Unleash Python Client (`UnleashClient`)
- Unleash Proxy Client JS (`unleash-proxy-client`)
- Unleash `flexibleRollout` activation strategy

## Sources Consulted
- LaunchDarkly Python SDK reference: https://launchdarkly.com/docs/sdk/server-side/python
- LaunchDarkly JavaScript Client SDK reference: https://launchdarkly.com/docs/sdk/client-side/javascript
- Unleash Python SDK docs: https://docs.getunleash.io/reference/sdks/python
- Unleash JavaScript Browser SDK docs: https://docs.getunleash.io/reference/sdks/javascript-browser
- Unleash Predefined Strategy Types: https://docs.getunleash.io/reference/predefined-strategy-types
- Python `hashlib` docs (SHA256, `int.from_bytes`)
- Go `encoding/binary` (`BigEndian.Uint32`) and `crypto/sha256` docs
- Node.js `crypto.createHash` docs

## Issues Found
- **Mermaid diagrams used `<=` while the code uses `<`.** Three diagram conditions read "Hash Value <= Rollout %", "42 <= 50%?", and "78 <= 50%?" — but every code sample (Python, TypeScript, Go) uses strict less-than (`bucket < rollout_percentage`). With `<=`, a 10% rollout would actually enable 11 of 100 buckets (11%), making the diagrams inconsistent with the algorithm and slightly inaccurate. Updated all three conditions to use `<` so the diagrams match the code. No code changes were needed.

## Review Notes
- The LaunchDarkly Python snippet uses `Context.builder(user_id).kind("user").build()`. The explicit `.kind("user")` is redundant because `"user"` is the default context kind in the v8+ Context API, but it is not incorrect — kept as-is since the author may have intended it for clarity.
- The LaunchDarkly JavaScript snippet targets the SDK's `initialize`-based API (v3.x). In a future major release the `change:<flagKey>` event signature may change; this is correct against the currently supported API.
- The term "consistent hashing" is used here in the feature-flag-industry sense (deterministic/stable bucketing per user). In distributed-systems literature it specifically refers to Karger et al.'s ring-based partitioning, but the colloquial usage in feature flag tooling is standard and not worth flagging.
- All from-scratch hashing implementations are equivalent across Python, TypeScript, and Go: they all SHA-256 the input, take the first 4 bytes as a big-endian uint32, modulo 100, and compare strictly less than the rollout percentage. Cross-language behavior is consistent for the same user_id / feature_key.
