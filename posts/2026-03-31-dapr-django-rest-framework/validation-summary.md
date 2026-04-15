# Validation Summary: How to Use Dapr with Django REST Framework

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and CLI)
- Dapr Python SDK (`dapr` PyPI package)
- Django REST Framework
- Python 3
- Dapr state management, pub/sub, and service invocation building blocks

## Sources Consulted
- Dapr Python SDK source code and PyPI listing (https://pypi.org/project/dapr/)
- Dapr Python SDK GitHub repository (https://github.com/dapr/python-sdk) — `DaprClient` class signatures for `get_state`, `save_state`, `publish_event`, `invoke_method`
- Dapr official documentation for programmatic subscriptions (https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/)
- Dapr CLI reference for `dapr run` command (https://docs.dapr.io/reference/cli/dapr-run/)
- CloudEvents specification for pub/sub event envelope format
- Django REST Framework documentation (https://www.django-rest-framework.org/)

## Issues Found
1. **Missing `import os` in `settings.py` snippet**: The settings code used `os.environ.get('DAPR_HTTP_PORT', '3500')` without importing the `os` module, which would cause a `NameError` at runtime. Fixed by adding `import os` at the top of the settings snippet.

## Review Notes
- The programmatic subscription endpoint uses the older `route` (string) field format instead of the newer `routes` (object with `default` key) format. Both are supported by the Dapr runtime due to backward compatibility, so the code works correctly as written. A future revision could update to the `routes` format for alignment with current documentation.
- The `DAPR_HTTP_PORT` setting is defined in `settings.py` but never referenced elsewhere in the code. The `DaprClient()` reads the `DAPR_HTTP_PORT` environment variable directly, so the Django setting is redundant. This is not incorrect but could be confusing to readers.
- `json.loads(result.data)` in `invoke_service` works because `json.loads` accepts bytes in Python 3, though `result.json()` would be a more idiomatic alternative using the SDK's built-in convenience method.
