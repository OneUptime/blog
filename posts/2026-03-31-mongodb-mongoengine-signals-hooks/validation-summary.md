# Validation Summary: How to Use MongoEngine Signals and Hooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- MongoEngine (Python ODM)
- Python
- Blinker (signal library used internally by MongoEngine)

## Sources Consulted
- MongoEngine signals documentation: https://docs.mongoengine.org/guide/signals.html
- MongoEngine source code (`mongoengine/signals.py`): https://github.com/MongoEngine/mongoengine/blob/master/mongoengine/signals.py
- MongoEngine document source code (`mongoengine/document.py`) for signal dispatch in `save()` and `delete()`
- Blinker library documentation for `connect()` and `disconnect()` API

## Issues Found
1. **Incorrect reference to `@receiver` decorator (line 33)**: The section heading "Connecting Signals with Decorators" and text "The cleanest approach is the `@receiver` decorator pattern via the `connect` method" incorrectly implies MongoEngine has a `@receiver` decorator. This is a Django concept (`django.dispatch.receiver`), not a MongoEngine feature. The code example below the heading correctly uses `signals.pre_save.connect()` with no decorator. Fixed the heading to "Connecting Signals with `connect()`" and rewrote the description to accurately describe what the code does.

2. **Missing `pre_save_post_validation` signal from available signals list**: The list of available signals omitted `pre_save_post_validation`, which fires after validation but before the actual database write. Added it to the list.

## Review Notes
- `datetime.utcnow()` is used in the timestamp example. This method is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. The code still works but may generate deprecation warnings on Python 3.12+.
- The `disconnect()` method works because MongoEngine signals are blinker `Signal` objects, but it requires the `blinker` package to be installed. Without blinker, MongoEngine uses a `_FakeSignal` fallback where `disconnect()` raises `RuntimeError`.
- The `clean()` explanation is technically correct: `clean()` is called during `validate()`, and `validate()` is called by `save()` by default. The post's simpler phrasing is acceptable for a tutorial.
