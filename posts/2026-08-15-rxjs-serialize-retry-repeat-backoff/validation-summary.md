# Validation Summary: Serialize RxJS `retry` and `repeat` to Prevent Overlapping Polls

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RxJS 7.8.2 Observables and higher-order mapping operators
- RxJS `retry`, `repeat`, `defer`, `timer`, and `throwError`
- RxJS Ajax and XMLHttpRequest cancellation
- TypeScript
- HTTP polling, exponential backoff with full jitter, and retry policies
- Observable concurrency and subscription lifecycle management

## Sources Consulted
- RxJS `retry` API: https://rxjs.dev/api/index/function/retry
- RxJS `RetryConfig` API: https://rxjs.dev/api/operators/RetryConfig
- RxJS `repeat` API: https://rxjs.dev/api/index/function/repeat
- RxJS `RepeatConfig` API: https://rxjs.dev/api/operators/RepeatConfig
- RxJS `defer` API: https://rxjs.dev/api/index/function/defer
- RxJS Ajax API: https://rxjs.dev/api/ajax/ajax
- RxJS `AjaxError` API: https://rxjs.dev/api/ajax/AjaxError
- RxJS `mergeMap` API: https://rxjs.dev/api/operators/mergeMap
- RxJS `concatMap` API: https://rxjs.dev/api/operators/concatMap
- RxJS `exhaustMap` API: https://rxjs.dev/api/operators/exhaustMap
- RxJS higher-order Observables guide: https://rxjs.dev/guide/higher-order-observables
- RxJS `retryWhen` deprecation notice: https://rxjs.dev/api/index/function/retryWhen
- RxJS `repeatWhen` deprecation notice: https://rxjs.dev/api/index/function/repeatWhen
- RxJS 7.8.2 `retry` implementation: https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/retry.ts
- RxJS 7.8.2 `repeat` implementation: https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/repeat.ts
- RxJS 7.8.2 Ajax implementation and teardown: https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/ajax/ajax.ts
- Official RxJS repository version guidance: https://github.com/ReactiveX/rxjs

## Issues Found
- The post implied that `defer` is what makes `ajax.getJSON` cold and causes retries and repeats to issue fresh requests. RxJS Ajax already creates and sends a new XMLHttpRequest for each subscription. Clarified that `defer` is valid here because it makes creation of a new request Observable explicit for each resubscription, but it is not what makes `ajax.getJSON` cold.
- The statement that there is never more than one active request was too broad because separate subscriptions to the cold `poll$` create independent polling loops that can overlap. Scoped the guarantee to a single subscription to `poll$`.
- The deprecation statement was not version-qualified and linked only to a generic deprecations landing page that does not list these operators. Updated it to the exact RxJS 7.8.2 guidance—removal in v9 or v10—and linked the specific `retryWhen` and `repeatWhen` API notices.

## Review Notes
The examples were checked with TypeScript 5.9.3 in strict mode against the current stable RxJS 7.8.2 package and type-checked successfully when the application-specific `render` and `reportTerminalPollingFailure` functions were declared. A runtime probe confirmed one-based retry counts, a fresh retry budget after `repeat`, and a maximum of one active source subscription within one polling subscription. `retry({ count: 4 })` correctly means four retries after the initial attempt, and an erroring delay notifier correctly terminates retrying.

As of the validation date, RxJS 9.0.0-beta.0 is available under the `next` npm tag and has a different package/import surface; the post targets the current stable 7.8.2 API and does not claim prerelease compatibility. The conditional retry example intentionally implements retries for `429` and status codes of `500` or greater only. Applications that also classify RxJS Ajax timeout or network errors as transient must add those cases to their policy explicitly.
