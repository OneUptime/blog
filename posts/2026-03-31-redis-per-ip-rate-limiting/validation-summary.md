# Validation Summary: How to Implement Per-IP Rate Limiting with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INCR, EXPIRE, TTL, SETEX, EXISTS, SCAN, pipeline/MULTI-EXEC)
- Python 3 (redis-py client library)
- Flask (before_request hook, request object, jsonify)
- Bash (redis-cli monitoring commands)

## Sources Consulted
- redis-py official documentation — https://redis-py.readthedocs.io/en/stable/ — verified `pipeline()`, `incr()`, `expire()`, `ttl()`, `exists()`, `setex()` APIs and that `pipeline()` defaults to `transaction=True` (MULTI/EXEC)
- Redis official command reference — https://redis.io/commands/ — verified INCR, EXPIRE, TTL, SETEX, EXISTS, SCAN, GET commands and their return types
- Flask official documentation — https://flask.palletsprojects.com/ — verified `before_request` decorator behavior (returning non-None short-circuits the request), `request.headers`, `request.remote_addr`, `jsonify`, and tuple response format `(body, status_code)`
- MDN Web Docs on X-Forwarded-For — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For — verified leftmost IP is the original client IP in standard configurations

## Issues Found
- **Monitoring command sort field was incorrect**: The bash command `sort -t: -k4 -rn` sorted by field 4 (the window number) instead of field 5 (the count value). The output format `ratelimit:ip:<IPv4>:<window>: <count>` has 5 colon-delimited fields: `ratelimit`, `ip`, the IPv4 address (dots not colons), the window number, and the count. Changed `-k4` to `-k5` to correctly sort by request count.

## Review Notes
- The `X-Forwarded-For` extraction takes the leftmost IP, which is the standard approach but can be spoofed by clients. In high-security contexts, the rightmost trusted proxy IP is preferred. This is a design trade-off rather than a bug, so no change was made.
- The `check_with_blocklist` function returns a dict with only `allowed` and `blocked` keys when the IP is blocked, while normal responses include `count`, `remaining`, and `reset_in`. Callers should handle both shapes. This is acceptable for a tutorial example.
- The monitoring bash command assumes IPv4 addresses. IPv6 addresses contain colons and would break the field-based sort. This is an inherent limitation of the simple monitoring approach shown.
- The fixed-window rate limiting approach is well-implemented. For production systems, sliding window algorithms (e.g., using Redis sorted sets) offer smoother rate limiting, but the fixed-window approach shown is a correct and commonly used starting point.
