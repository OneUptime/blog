# Validation Summary: How to Build Webhook Handlers in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- FastAPI
- Flask
- Webhooks
- HMAC-SHA256 signature verification
- Redis / redis-py
- asyncio background workers
- Pydantic
- GitHub webhooks
- FastAPI TestClient / pytest

## Sources Consulted
- Python `hmac` documentation: https://docs.python.org/3/library/hmac.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- FastAPI response status code documentation: https://fastapi.tiangolo.com/tutorial/response-status-code/
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- FastAPI `Request` documentation: https://fastapi.tiangolo.com/reference/request/
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- GitHub validating webhook deliveries documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub webhook events and payloads documentation: https://docs.github.com/en/webhooks/webhook-events-and-payloads
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Redis `SETEX` command documentation: https://redis.io/docs/latest/commands/setex/
- OneUptime homepage and related blog links: https://oneuptime.com/

## Issues Found
- The generic FastAPI signature verification example accepted unsigned requests because it verified the signature only when the header was present. I changed the handler to require `X-Webhook-Signature` and return `401` when it is missing, matching the security guidance later in the post.
- The Redis idempotency example used a separate existence check and later write, which could allow duplicate concurrent processing. I changed it to claim events with Redis `SET` using `nx=True` and `ex=...`, then store completed results with `SET ... EX`.
- The Redis example used `setex`; redis-py documents that Redis considers `SETEX` deprecated in favor of `SET` with `EX`. I updated the sample accordingly.
- The FastAPI background worker example used `@app.on_event("startup")`, which FastAPI now documents under deprecated alternative events. I changed it to use a lifespan context manager.
- The async FastAPI route claimed to return `202 Accepted`, but without `status_code=202` FastAPI would return `200 OK` by default. I added `status_code=202` to the route decorator.
- The async and Flask examples used `datetime.utcnow()`, which Python 3.12 deprecates. I changed them to timezone-aware `datetime.now(timezone.utc)`.
- The Flask GitHub webhook example used a generic `X-Webhook-Signature` header and compared against a bare digest. GitHub sends `X-Hub-Signature-256` with a `sha256=` prefix, so I updated the header lookup and comparison.
- The FastAPI test helper signed `json.dumps(payload)` while the request used `TestClient(..., json=payload)`, which can produce different JSON bytes. I changed the test to sign and send the exact same encoded bytes via `content=...`.
- The missing-signature test allowed either `200` or `401`, which conflicted with the post's security guidance and the corrected handler behavior. I changed it to expect `401`.

## Review Notes
All Python code blocks were checked for syntax with `ast.parse`. I did not run the snippets as full applications because they are illustrative standalone examples and some require external services such as Redis.
