# Validation Summary: How to Trace Django REST Framework API Endpoints with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Django REST Framework
- Django
- django-filter
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP HTTP exporters
- OpenTelemetry Django instrumentation
- Python

## Sources Consulted
- Django REST Framework views documentation: https://www.django-rest-framework.org/api-guide/views/
- Django REST Framework viewsets documentation: https://www.django-rest-framework.org/api-guide/viewsets/
- Django REST Framework requests documentation: https://www.django-rest-framework.org/api-guide/requests/
- Django REST Framework serializer fields documentation: https://www.django-rest-framework.org/api-guide/fields/
- Django REST Framework filtering documentation: https://www.django-rest-framework.org/api-guide/filtering/
- Django REST Framework exceptions documentation: https://www.django-rest-framework.org/api-guide/exceptions/
- Django REST Framework authentication documentation: https://www.django-rest-framework.org/api-guide/authentication/
- django-filter DRF integration documentation: https://django-filter.readthedocs.io/en/latest/guide/rest_framework.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python instrumentation and metrics documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Django instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/django/django.html

## Issues Found
- The install command used the broad `opentelemetry-exporter-otlp` package while the code imports the OTLP HTTP/protobuf exporter. Changed it to the documented `opentelemetry-exporter-otlp-proto-http` package.
- The post used `django-filter` later but did not install it. Added `django-filter` to the install command.
- The telemetry setup configured traces only, but the post later creates OpenTelemetry metrics. Added OTLP metric exporter setup with `MeterProvider` and `PeriodicExportingMetricReader`.
- The Django instrumentation package was installed but not activated. Added `DjangoInstrumentor().instrument()`.
- The `TracedAPIView.dispatch` example accessed `request.query_params` before DRF converted Django's `HttpRequest` into a DRF `Request`, and it manually called `initial()` before delegating to `super().dispatch()`, which would run DRF initialization twice. Reworked the example to call `initialize_request()`, `initial()`, the method handler, `handle_exception()`, and `finalize_response()` in the documented DRF dispatch flow.
- The response size example used `json.dumps(response.data)`, which can fail for values DRF's JSON renderer supports. Changed it to `JSONRenderer().render(response.data)`.
- The ViewSet example accessed `self.action` before DRF sets it during request initialization. Changed it to derive the action from `action_map` before calling `super().dispatch()`.
- The ViewSet example returned `Response(...)` without importing `Response`. Added the missing import.
- The ViewSet list example used `page or queryset`, which can serialize the full queryset when an empty page is returned. Changed it to an explicit `page if page is not None else queryset`.
- The pagination example manually called `queryset.count()` before DRF pagination, creating an unnecessary extra count query. Changed it to use `self.page.paginator.count` after DRF paginates.
- The filtering example subclassed `FilterSet` with a DRF backend-style `filter_queryset(request, queryset, view)` classmethod, which is not the correct django-filter extension point. Replaced it with a `DjangoFilterBackend` subclass that overrides `filter_queryset()`.
- The filtering example checked `paginator_class`, which is not the DRF view setting used for pagination. Changed the logic to use `pagination_class`.

## Review Notes
The examples are now technically consistent with current DRF, django-filter, and OpenTelemetry Python APIs. The manual tracing examples may overlap with automatic spans from `DjangoInstrumentor`, so production users should decide how much manual span detail they want to add on top of Django auto-instrumentation.
