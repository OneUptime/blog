# Validation Summary: How to Build Task Queues with Dramatiq in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Dramatiq
- Redis
- RabbitMQ
- Background task queues
- Dramatiq workers and CLI
- Dramatiq retries, callbacks, results, groups, and pipelines
- systemd

## Sources Consulted
- Dramatiq 2.2.0 User Guide: https://dramatiq.io/guide.html
- Dramatiq 2.2.0 Cookbook: https://dramatiq.io/cookbook.html
- Dramatiq 2.2.0 API Reference: https://dramatiq.io/reference.html
- Dramatiq callbacks middleware source documentation: https://dramatiq.io/_modules/dramatiq/middleware/callbacks.html
- Dramatiq retries middleware source documentation: https://dramatiq.io/_modules/dramatiq/middleware/retries.html
- Dramatiq CLI source reference: https://github.com/Bogdanp/dramatiq/blob/master/dramatiq/cli.py

## Issues Found
- The smart retry example raised `NonRetryableError` under an actor with `max_retries=5`, which would still be retried. Added `throws=(NonRetryableError,)` so validation errors fail without retrying, matching Dramatiq's retry middleware behavior.
- The queue prioritization text implied that separate queues are automatically processed before other queues. Revised the wording to explain that high-priority work should be handled by dedicated workers.
- The group result example called `get_results()` without configuring a result backend and without storing results for the grouped actor. Added the `Results` middleware with `RedisBackend` and marked the grouped actor with `store_results=True`.
- The callback example used plain Python functions for `on_failure` and `on_success`, but Dramatiq callbacks are actor callbacks that receive serialized message and exception/result data. Converted the callbacks to actors and used actor names in the actor options.
- The failure callback text said `on_failure` runs after all retries are exhausted. Dramatiq calls `on_failure` on each failed attempt, even when the message will be retried. Added `on_retry_exhausted` for the permanent-failure path.
- The robust retry example raised `PermanentError` while still allowing the actor to retry. Added `throws=(PermanentError,)` so permanent failures are not retried.

## Review Notes
The code snippets were syntax-checked after the corrections. Several examples still contain placeholder application functions such as `process_data`, `send_email`, and `store_failed_message`; these are acceptable for a tutorial but would need concrete implementations in a runnable sample project.
