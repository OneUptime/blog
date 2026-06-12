# Validation Summary: How to Use Locust for API Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Locust
- Python
- REST APIs
- GraphQL over HTTP
- JWT bearer authentication
- OAuth 2.0 client credentials
- API key authentication
- Multipart file uploads
- Pagination
- Rate limiting

## Sources Consulted
- Locust API documentation: https://docs.locust.io/en/stable/api.html
- Locust TaskSet documentation: https://docs.locust.io/en/stable/tasksets.html
- Locust event hooks documentation: https://docs.locust.io/en/stable/extending-locust.html
- OAuth 2.0 RFC 6749: https://datatracker.ietf.org/doc/html/rfc6749
- GraphQL Serving over HTTP guide: https://graphql.org/learn/serving-over-http/
- Python `requests` package behavior checked locally for response context manager and absence of `success()` / `failure()` methods on plain responses.

## Issues Found
- The GraphQL helper returned `self.client.post(...)` without `catch_response=True`, but the tasks used it in `with` blocks and called `response.success()` / `response.failure()`. Locust only exposes those manual result methods on `ResponseContextManager` when `catch_response=True` is used. Added `catch_response=True` to the GraphQL POST helper.

## Review Notes
- The examples are illustrative and depend on matching API response shapes, status codes, and authentication endpoints in the target application.
- All Python code fences were parsed with Python's `ast` module after the fix; all nine snippets are syntactically valid.
