# Validation Summary: How to Write Locust User Classes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Locust
- Python
- HTTP load testing
- TaskSet and SequentialTaskSet
- Locust event hooks
- Custom Locust clients for non-HTTP protocols

## Sources Consulted
- Locust documentation: Writing a locustfile - https://docs.locust.io/en/stable/writing-a-locustfile.html
- Locust documentation: API reference - https://docs.locust.io/en/stable/api.html
- Locust documentation: Testing other systems/protocols - https://docs.locust.io/en/stable/testing-other-systems.html
- Locust documentation: Event hook source/API details - https://docs.locust.io/en/stable/_modules/locust/event.html

## Issues Found
- The `HttpUser` custom validation example called `response.failure()` on a normal response object. Locust requires `catch_response=True` and a `with` block to manually mark an HTTP request as failed or successful. Updated the example to use `with self.client.get("/", catch_response=True) as response:`.
- The custom client example calculated elapsed request time with `time.time()`. Locust's current custom-client examples use `time.time()` for the event `start_time` and `time.perf_counter()` for elapsed response time measurement. Updated the example to use `time.perf_counter()` for `response_time`.

## Review Notes
- The remaining Locust concepts and APIs reviewed are consistent with the current Locust 2.44 documentation, including `HttpUser`, `HttpSession`, task weights, `TaskSet.interrupt()`, `SequentialTaskSet`, built-in wait time helpers, `name` request grouping, lifecycle hooks, and request event reporting for custom clients.
- Local execution of the examples was not performed because Locust is not installed in the available Python environment.
