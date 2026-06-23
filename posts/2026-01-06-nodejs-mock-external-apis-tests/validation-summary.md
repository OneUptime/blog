# Validation Summary: How to Mock External APIs in Node.js Tests Without Flaky Network Calls

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Nock
- Mock Service Worker (MSW) v2+
- Jest
- Stripe API and webhooks
- @faker-js/faker
- SuperTest

## Sources Consulted
- Nock official README: https://github.com/nock/nock
- MSW setupServer documentation: https://mswjs.io/docs/api/setup-server/
- MSW resetHandlers documentation: https://mswjs.io/docs/api/setup-server/reset-handlers/
- MSW 1.x to 2.x migration guide: https://mswjs.io/docs/migrations/1.x-to-2.x/
- Jest snapshot testing documentation: https://jestjs.io/docs/snapshot-testing
- Stripe webhook documentation: https://docs.stripe.com/webhooks
- Faker.js API documentation: https://fakerjs.dev/api/string and https://fakerjs.dev/api/person

## Issues Found
- The Nock recorder example did not stop recording after calling `nock.recorder.play()`. Nock's official documentation says recording should be stopped with `nock.restore()`, and mocks are not enabled while recording is active. Added `nock.restore()` after playback.
- The Stripe webhook SuperTest example signed a JSON string but did not explicitly send the request as `application/json`, and the invalid-signature case sent an object rather than the raw JSON string. Stripe requires signature verification against the raw request body. Updated both webhook requests to set `Content-Type: application/json` and send the exact JSON string payload.

## Review Notes
- The MSW v2 examples use the current `http` and `HttpResponse` APIs and the documented `setupServer`, `server.use()`, `resetHandlers()`, and `close()` lifecycle pattern.
- The Nock request matching, query matching, delay, persistence, recording, `define()`, `isDone()`, `pendingMocks()`, and `cleanAll()` examples align with current Nock documentation.
- The Jest snapshot property matcher example is consistent with Jest's documented snapshot testing behavior.
