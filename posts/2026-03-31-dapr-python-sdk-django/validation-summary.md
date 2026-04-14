# Validation Summary: How to Use Dapr Python SDK with Django

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar runtime for microservices)
- Dapr Python SDK (`dapr` pip package)
- Python
- Django
- Django REST Framework
- Dapr State Management
- Dapr Pub/Sub Messaging

## Sources Consulted
- Dapr Python SDK client documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr pub/sub how-to guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr programmatic subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Python SDK GitHub repository: https://github.com/dapr/python-sdk

## Issues Found
- **Missing URL routes for pub/sub subscription endpoints.** The URL Configuration section only included routes for `OrderView` but omitted the routes for `subscribe` (mapped to `/dapr/subscribe`) and `handle_inventory_update` (mapped to `/inventory-update`). Without these, Dapr would not discover the programmatic subscriptions at startup and incoming pub/sub events would never reach the handler. Fixed by adding `path("dapr/subscribe", subscribe)` and `path("inventory-update", handle_inventory_update)` to `orders/urls.py`, along with the necessary imports.

## Review Notes
- All Dapr Python SDK API calls (`save_state`, `get_state`, `publish_event`) use correct parameter names and are consistent with official documentation.
- `DaprClient()` used as a context manager is the documented pattern.
- The `get_state` response `.data` attribute returns bytes; the `.decode("utf-8")` call is correct.
- The programmatic subscription format using the simple `"route"` field (as opposed to the advanced `"routes"` object with CEL rules) is valid.
- The handler returning `{"status": "SUCCESS"}` matches documented response values (`SUCCESS`, `RETRY`, `DROP`).
- The `dapr run` CLI command syntax is correct.
- The `views.py` file imports `json` and `from rest_framework import status` but neither is used in the `OrderView` class. This is a minor code quality issue (unused imports) but does not affect functionality.
- The post does not show the project-level `myproject/urls.py` that would include the orders app URLs (e.g., `path("", include("orders.urls"))`). This is a common omission in Django tutorials and is standard Django knowledge, so it was not added.
