# Validation Summary: How to Fix the Import Order Problem Where Python Instrumentors Must Be Applied

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- OpenTelemetry Python
- OpenTelemetry Python zero-code instrumentation
- OpenTelemetry Flask instrumentation
- OpenTelemetry requests instrumentation
- OpenTelemetry SQLAlchemy instrumentation
- OpenTelemetry Django instrumentation
- WSGI and ASGI server startup

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python getting started guide: https://opentelemetry.io/docs/languages/python/getting-started/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry requests instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/requests.html
- OpenTelemetry SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry SQLAlchemy instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/sqlalchemy.html
- OpenTelemetry Django instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/django/django.html
- OpenTelemetry WSGI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/wsgi/wsgi.html

## Issues Found
- The post incorrectly claimed that `requests` is a strict import-order case and that importing `requests` before `RequestsInstrumentor().instrument()` may prevent spans. Current OpenTelemetry requests instrumentation patches `requests.sessions.Session.send`, and the official requests instrumentation docs/source show examples where `requests` is imported before `RequestsInstrumentor().instrument()`. I replaced this section with a SQLAlchemy timing example, where the official docs recommend passing an existing engine to `SQLAlchemyInstrumentor().instrument(engine=engine)` or instrumenting before engine creation.
- The post described Python OpenTelemetry import order as an absolute rule. I narrowed the wording to "safe timing" and "application imports and initializes" because the current instrumentors vary: some patch modules or factory functions globally, while others provide object-specific APIs such as Flask `instrument_app(app)` and SQLAlchemy `instrument(engine=engine)`.
- The initial Flask example was labeled as a broken import order even though Flask instrumentation provides `instrument_app(app)` and global Flask instrumentation is more forgiving than the original wording suggested. I changed the label and comment to describe it as fragile global setup rather than definitively broken.

## Review Notes
The `opentelemetry-instrument python app.py` command and the manual TracerProvider, BatchSpanProcessor, OTLPSpanExporter, Flask `instrument_app(app)`, SQLAlchemyInstrumentor, and DjangoInstrumentor API names are consistent with current OpenTelemetry Python documentation. The local environment did not have `opentelemetry-instrument` installed, so CLI behavior was verified against official OpenTelemetry documentation rather than local `--help` output.
