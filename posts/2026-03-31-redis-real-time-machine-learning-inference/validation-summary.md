# Validation Summary: How to Use Redis for Real-Time Machine Learning Inference

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, Streams, Pipelining, TTL/expiry)
- Python (redis-py client library)
- NumPy
- RedisAI (mentioned as optional, not demonstrated in code)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis XREAD command documentation: https://redis.io/docs/latest/commands/xread/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis Streams introduction: https://redis.io/docs/latest/develop/data-types/streams/
- NumPy documentation for `np.dot`: https://numpy.org/doc/stable/reference/generated/numpy.dot.html

## Issues Found

1. **Unused `import json`**: The first code block imported `json` but never used it. Removed the unused import.

2. **Redis Streams `xread` with `$` in every loop iteration (message loss bug)**: The `process_requests` consumer function used `'$'` as the stream ID on every `xread` call inside the `while True` loop. The special ID `$` resolves to the latest stream ID *at the time of the call*, meaning messages that arrive between the return of one `xread` and the start of the next call are silently skipped. Fixed by introducing a `last_id` variable initialized to `'$'` (to start reading only new messages), then updating it to the last received message ID after each message is processed. Also replaced the `messages or []` fallback with an explicit `if messages:` guard for clarity.

## Review Notes
- The description mentions RedisAI but the post only uses it in the architecture diagram as an optional component. The code examples use a simple linear model with NumPy instead. This is fine as-is since the post focuses on the feature store and caching pattern rather than RedisAI specifically, but a future revision could add a RedisAI example.
- The `predict_churn` function with the example features (age=28, purchase_count=15, avg_order_value=67.5, days_since_last_visit=2) produces a churn probability of 0.0 due to the dot product being negative before clamping. The math is correct, but a different set of example weights or features might produce a more illustrative non-zero result.
- The `store_user_features` function stores a "country" field, but `get_user_features` does not extract it (only numeric features are used). This is intentional for the numeric model but could confuse readers who expect all stored features to be consumed.
