# Validation Summary: How to Handle Contract Testing Between Services

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Contract testing
- Pact and Pact Broker
- Pact Python
- Python
- pytest
- Flask
- OpenAPI schema validation
- jsonschema
- Pydantic
- GitHub Actions
- Docker Compose

## Sources Consulted
- Pact Python consumer testing docs: https://docs.pact.io/implementation_guides/python/docs/consumer
- Pact Python provider testing docs: https://docs.pact.io/implementation_guides/python/docs/provider
- Pact Python API reference: https://pact-foundation.github.io/pact-python/api/
- Pact Python migration guide: https://github.com/pact-foundation/pact-python/blob/main/MIGRATION.md
- Pact Broker Client CLI docs: https://docs.pact.io/pact_broker/client_cli/readme
- Pact Broker publishing docs: https://docs.pact.io/pact_broker/publishing_and_retrieving_pacts
- jsonschema validation docs: https://python-jsonschema.readthedocs.io/en/stable/validate/
- Pydantic model docs: https://pydantic.dev/docs/validation/latest/concepts/models/
- Flask quickstart and API docs: https://flask.palletsprojects.com/en/stable/quickstart/ and https://flask.palletsprojects.com/en/stable/api/
- pytest fixture docs: https://docs.pytest.org/en/stable/explanation/fixtures.html
- GitHub Actions checkout and setup-python Marketplace docs: https://github.com/marketplace/actions/checkout and https://github.com/marketplace/actions/setup-python

## Issues Found
- The Pact consumer example used the older `Consumer(...).has_pact_with(...)`, `Like`, `EachLike`, `Term`, `pact.start_service()`, and `with pact:` API. Updated it to the current Pact Python v3 API using `Pact`, `match`, `pact.serve()`, `write_file()`, and the current matcher signatures.
- The Pact provider example used the older `Verifier(provider=..., provider_base_url=...)` and `verify_with_broker(...)` API. Updated it to the current fluent `Verifier('provider').add_transport(...).broker_source(...).include_pending().include_wip_since(...).build().verify()` style, including `set_publish_options()`.
- The URL-based provider state handler was missing the required `body` setting for current Pact Python. Added `body=True` because the Flask endpoint reads JSON from the request body.
- Several snippets had missing imports that would fail immediately: `os`, `pytest`, and `patch`. Added the missing imports where used.
- The Pydantic event model used an unnecessary nested/forward `OrderData` definition and reassignment. Replaced it with a straightforward `OrderData` model defined before `OrderCreatedEvent`.
- The CI example installed only `pact-python` but used the `pact-broker` CLI. Updated the consumer job to install `pact-python-cli` as well.
- The CI provider verification step used a CLI invocation inconsistent with the updated Python provider verification example. Updated it to install Python test dependencies and run the provider contract pytest file.

## Review Notes
- The examples still use application-specific placeholders such as `myapp.clients`, `db`, `docker_services`, and `user_service_client`; these are reasonable for a tutorial but require project-specific fixtures and implementations.
- Pact Broker bearer-token authentication is used in the examples. The official Pact Broker CLI docs note that bearer-token authentication is for PactFlow, while OSS Pact Broker supports basic auth.
