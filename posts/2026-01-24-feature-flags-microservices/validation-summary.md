# Validation Summary: How to Handle Feature Flags in Microservices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Feature flags
- Microservices
- Python
- FastAPI
- Pydantic
- Flask
- Starlette middleware
- Requests
- HTTPX
- pytest
- HMAC signing
- YAML rollout configuration
- Mermaid diagrams

## Sources Consulted
- FastAPI documentation: Body - Multiple Parameters: https://fastapi.tiangolo.com/tutorial/body-multiple-params/
- FastAPI documentation: Query Parameters: https://fastapi.tiangolo.com/tutorial/query-params/
- Starlette documentation: Middleware: https://starlette.dev/middleware/
- Pydantic documentation: Fields and default_factory: https://docs.pydantic.dev/latest/concepts/fields/
- Python documentation: dataclasses default_factory: https://docs.python.org/3/library/dataclasses.html
- Python documentation: hmac and compare_digest: https://docs.python.org/3/library/hmac.html
- Requests documentation: Quickstart and request parameters: https://requests.readthedocs.io/en/latest/user/quickstart/
- HTTPX documentation: API reference for AsyncClient request parameters: https://www.python-httpx.org/api/
- pytest documentation: parametrizing tests: https://docs.pytest.org/en/stable/how-to/parametrize.html

## Issues Found
- The FastAPI/Pydantic flag context model used a mutable dictionary literal for `attributes`. Pydantic copies unhashable defaults, but the documented and clearer pattern for generated mutable defaults is `Field(default_factory=dict)`, so the snippet now imports `Field` and uses `Field(default_factory=dict)`.
- The context propagation snippet used `os.environ`, `time.time()`, and `logger.warning()` without importing or initializing `os`, `time`, or `logger`. Added the missing imports and logger initialization.
- The request-scoped flags snippet referenced `Optional` without importing it. Added `Optional` to the typing import.
- The request-scoped snapshot was described as immutable, but the example intentionally adds evaluated flags to the snapshot during the request. Updated the docstring to describe it as request-scoped instead of immutable.
- The pytest helper snippet used `Dict` and `Any` in annotations without importing them. Added the missing typing import.
- The rollout controller called `_evaluate_threshold()` but did not define it. Added `_evaluate_threshold()` and `_parse_metric_value()` helpers for the threshold formats used in the examples, including simple numeric, percent, time-suffixed, and baseline-minus comparisons.

## Review Notes
- The code snippets are illustrative and still assume surrounding application objects such as initialized clients, service fixtures, and metrics endpoints exist.
- The HMAC example correctly uses `hmac.compare_digest()` for signature comparison. For production systems, consider using a full-length signature instead of truncating the hex digest.
- The examples use MD5 only for deterministic bucketing, not for security-sensitive hashing.
