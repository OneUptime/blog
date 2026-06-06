# Validation Summary: How to Use Django Signals

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Django (signals framework: `django.dispatch`, `django.db.models.signals`)
- Python
- Django ORM (model lifecycle, QuerySet methods)
- Django AppConfig / `ready()` lifecycle hook
- Django `contenttypes` framework (GenericForeignKey, ContentType)
- Django middleware
- Django testing (`TestCase`, `unittest.mock.patch`)

## Sources Consulted
- Django signals documentation: https://docs.djangoproject.com/en/5.0/topics/signals/
- Django built-in model signals reference: https://docs.djangoproject.com/en/5.0/ref/signals/
- Django `QuerySet.delete()` and `update()` docs: https://docs.djangoproject.com/en/5.0/ref/models/querysets/#delete and https://docs.djangoproject.com/en/5.0/ref/models/querysets/#update
- Django `bulk_create()` docs: https://docs.djangoproject.com/en/5.0/ref/models/querysets/#bulk-create
- Django AppConfig docs (auto-detection / `default = True`): https://docs.djangoproject.com/en/5.0/ref/applications/#for-application-users
- Django release notes regarding `default_app_config` deprecation (3.2) and removal (5.1): https://docs.djangoproject.com/en/5.1/releases/5.1/
- Django `django.dispatch.Signal` docs (re: `providing_args` deprecation in 3.1, removal in 4.0): https://docs.djangoproject.com/en/4.0/releases/4.0/
- `django.utils.text.slugify` docs: https://docs.djangoproject.com/en/5.0/ref/utils/#django.utils.text.slugify
- `m2m_changed` signal reference (action values, `pk_set`): https://docs.djangoproject.com/en/5.0/ref/signals/#m2m-changed

## Issues Found

1. **Mermaid sequence diagram contradicted the surrounding text.** The diagram labeled the signal dispatcher's calls to receivers as "(async)", but Django signals are synchronous and the prose just below the diagram correctly says so. Changed the labels to "(sync)" and reordered the messages so Receiver 1 completes before Receiver 2 is notified — which is how Django's synchronous, sequential dispatch actually works.

2. **Incorrect claim that `QuerySet.delete()` bypasses signals.** The "Signals in Bulk Operations" section listed `delete()` alongside `update()` and `bulk_create()` as bypassing signals. Per the Django docs, `QuerySet.delete()` does NOT call individual models' `delete()` methods, but it DOES still emit `pre_delete` and `post_delete` signals (including for cascaded deletes). Only `update()` and `bulk_create()` skip `pre_save`/`post_save` by default. Rewrote that paragraph to clarify the distinction, updated the inline code comment from "post_save signals" to "pre_save / post_save signals" for accuracy, and removed `delete()` from the example pair (the example only ever shows `update()` anyway).

3. **`default_app_config` is deprecated/removed.** The post recommended setting `default_app_config = 'myapp.apps.MyAppConfig'` in `myapp/__init__.py`. This pattern was deprecated in Django 3.2 (April 2021) and removed in Django 5.1. Since Django 3.2, an `AppConfig` subclass in `apps.py` is auto-detected as the default for its app. Replaced that snippet with a note about auto-detection and the modern `default = True` opt-in for cases with multiple `AppConfig` subclasses.

## Review Notes

- The post mentions the `providing_args` parameter to `Signal()` as "documentation only - Django does not enforce it." That statement is technically accurate for when it existed, but `providing_args` itself was deprecated in Django 3.1 and removed in 4.0. Since the code examples instantiate `Signal()` with no arguments (which is the current, correct form), this is not an outright error and I left it alone — but readers on Django 4.0+ will not see this parameter at all anymore.
- The `m2m_changed` example uses `instance` and `pk_set`. The full receiver signature also includes `reverse` and `model`, which are absorbed by `**kwargs` in the example. This is fine and idiomatic.
- The `audit_post_save` pattern relies on stashing `_original_values` on the instance via a `post_init` signal handler that the post hints at (imports `post_init` in the `apps.py` snippet) but does not show. This is a documentation gap rather than a technical error — the imported but unused `post_init` is a small dangling reference.
- The `AuditableMixin` is defined but never actually mixed into a model in the examples. Again, a small completeness gap rather than incorrectness.
- Using thread locals (`threading.local()`) for current-user tracking works under WSGI but can leak / not behave as expected under ASGI / async views. Worth a future caveat but not strictly wrong.
