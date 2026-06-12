# Validation Summary: How to Implement API Testing Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- pytest
- Flask
- JSON Schema and python-jsonschema
- JWT and PyJWT
- Pact Python
- requests
- unittest.mock
- Locust
- GitHub Actions
- Codecov GitHub Action
- PostgreSQL service containers in GitHub Actions

## Sources Consulted
- Flask Request.get_json API documentation: https://flask.palletsprojects.com/en/stable/api/#flask.Request.get_json
- python-jsonschema validation documentation: https://python-jsonschema.readthedocs.io/en/latest/validate/
- PyJWT usage documentation for registered claims and expiration handling: https://pyjwt.readthedocs.io/en/latest/usage.html
- Pact Python consumer testing documentation: https://docs.pact.io/implementation_guides/python/docs/consumer
- Pact Python API documentation: https://pact-foundation.github.io/pact-python/api/
- Locust quickstart and command line documentation: https://docs.locust.io/en/stable/quickstart.html
- pytest marker and configuration documentation: https://docs.pytest.org/en/stable/reference/reference.html
- actions/checkout documentation: https://github.com/actions/checkout
- actions/setup-python documentation: https://github.com/actions/setup-python
- actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- codecov/codecov-action documentation: https://github.com/codecov/codecov-action

## Issues Found
- Flask's `request.get_json()` can raise 415 Unsupported Media Type for non-JSON requests in Flask 2.3+ instead of reaching the article's 400 response path. Changed the example API to use `request.get_json(silent=True)` so the demonstrated error tests return the intended 400 response.
- The performance response-time test called `GET /api/users`, but the example Flask app only defined `POST /api/users` and `GET /api/users/<id>`. Added a simple `GET /api/users` route to make the later test example consistent with the API shown.
- The schema examples used JSON Schema `format` keywords but did not pass a `FormatChecker`; python-jsonschema treats `format` as informational without one. Updated schema tests to import and pass `FormatChecker()`.
- The JWT examples used naive `datetime.utcnow()` values. Updated them to use timezone-aware UTC datetimes with `datetime.now(tz=timezone.utc)`, matching PyJWT documentation and avoiding deprecated Python datetime usage.
- The authentication endpoint tests referenced `/api/protected-resource` without defining a protected route. Added a minimal route in the test snippet using the `require_auth` decorator so the middleware tests exercise the intended behavior.
- The Pact example used the older `Consumer` / `Provider` mock-service API. Updated it to the current Pact Python `Pact(...)`, `pact.serve()`, and `write_file(...)` pattern from official documentation.
- The pytest configuration used `-m "unit or integration"` even though the article's example tests were not marked, which would deselect unmarked tests by default. Changed the default `addopts` to enforce registered marker names without filtering all unmarked tests out.
- The GitHub Actions snippets used older action major versions. Updated examples to current official examples where applicable: `actions/checkout@v6`, `actions/setup-python@v6`, `actions/upload-artifact@v7`, and `codecov/codecov-action@v5`.
- Removed an unused `typing.Optional` import from the validator example.

## Review Notes
The code examples are illustrative and still omit production concerns such as password hashing, persistent storage, full authorization policy tests, and real provider verification for Pact contracts. Those omissions are called out or implied by the tutorial context and are not technical correctness issues for the examples shown.
