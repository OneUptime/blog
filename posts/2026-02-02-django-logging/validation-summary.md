# Validation Summary: How to Add Logging to Django Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (built-in `logging` module)
- Django (`LOGGING` dictConfig, `django.utils.log.AdminEmailHandler`)
- `python-json-logger` (third-party structured logging library)
- Python `logging.handlers` (RotatingFileHandler, TimedRotatingFileHandler, HTTPHandler, SMTPHandler, SysLogHandler)
- Mermaid (used in a diagram)

## Sources Consulted
- Django logging documentation: https://docs.djangoproject.com/en/5.1/topics/logging/
- Django `AdminEmailHandler` reference: https://docs.djangoproject.com/en/5.1/topics/logging/#django.utils.log.AdminEmailHandler
- Python `logging` module docs: https://docs.python.org/3/library/logging.html
- Python `logging.handlers` docs: https://docs.python.org/3/library/logging.handlers.html
- Python `logging.config` (dictConfig schema): https://docs.python.org/3/library/logging.config.html#logging-config-dictschema
- `python-json-logger` project (v3.x changelog noting module reorganization): https://github.com/nhairs/python-json-logger

## Issues Found
- **`python-json-logger` import path updated.** The post used the legacy factory path `pythonjsonlogger.jsonlogger.JsonFormatter`. In `python-json-logger` 3.0 (released December 2024) the package was reorganized and the formatter now lives at `pythonjsonlogger.json.JsonFormatter`. The old path still resolves but emits a `DeprecationWarning`. Changed the dict config `'()': 'pythonjsonlogger.jsonlogger.JsonFormatter'` to `'()': 'pythonjsonlogger.json.JsonFormatter'` so the example matches the current, non-deprecated API.

## Review Notes
- The five log level numeric values (DEBUG=10, INFO=20, WARNING=30, ERROR=40, CRITICAL=50) are correct per the stdlib `logging` module.
- `RotatingFileHandler` (`maxBytes`, `backupCount`) and `TimedRotatingFileHandler` (`when='midnight'`, `interval`, `backupCount`) parameters match the Python docs.
- The `'style': '{'` formatters with `{levelname} {asctime} ...` placeholders are valid for Python 3 `logging.Formatter`.
- The custom `WebhookHandler` example relies on `self.formatter` being non-`None` when `record.exc_info` is set; this works because the dict config example wires up a `formatter`, but readers who instantiate the handler directly without calling `setFormatter()` would hit an `AttributeError` on exceptions. Worth flagging in a follow-up but not technically wrong as written.
- Using f-strings in `logger.info(f"...")` is a stylistic choice that defeats lazy formatting (the message is always rendered even if the level is filtered out). The recommended idiom is `logger.info("Processing order %s", order_id)`. Not incorrect, just a common best-practice nit.
- The architectural mermaid diagram (Logger → Filter → Handler → Formatter → Output) is a simplification — in reality filters can live on both loggers and handlers, and each handler has its own level/filter/formatter chain — but it is acceptable as an introductory mental model.
- `logging.handlers.HTTPHandler` sends log records as urlencoded form data, not JSON. The post does not claim otherwise, but readers wanting JSON-over-HTTP should use the custom `WebhookHandler` pattern shown later in the post.
