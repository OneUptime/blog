# Validation Summary: How to Use the google-cloud/logging-winston Transport to Send Node.js Logs to

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js
- Winston
- @google-cloud/logging-winston
- Google Cloud Logging
- Google Cloud Trace
- Express
- express-winston
- gcloud CLI

## Sources Consulted
- Google Cloud: Setting up Cloud Logging for Node.js: https://cloud.google.com/logging/docs/setup/nodejs
- Google Cloud Node.js reference for @google-cloud/logging-winston 6.0.0: https://cloud.google.com/nodejs/docs/reference/logging-winston/latest/overview
- Google Cloud Node.js reference for LoggingWinston Options: https://cloud.google.com/nodejs/docs/reference/logging-winston/latest/logging-winston/options
- googleapis/nodejs-logging-winston README and packaged 6.0.1 source: https://github.com/googleapis/nodejs-logging-winston
- Winston README: https://github.com/winstonjs/winston
- express-winston 4.2.0 package documentation and type definitions: https://www.npmjs.com/package/express-winston
- gcloud logging read reference: https://cloud.google.com/sdk/gcloud/reference/logging/read

## Issues Found
- The custom severity mapping example used a `levelToSeverity` option that is not part of the current `LoggingWinston` options. Replaced it with the supported `levels` option and showed passing the same custom numeric level map to `winston.createLogger`.
- The structured error example placed an `Error` object under `error`, which does not reliably expose a stack trace as structured metadata. Changed it to capture `paymentError.stack` in the `stack` field, which `logging-winston` handles specially for logged errors.
- The Express request logging section said `@google-cloud/logging-winston` included the middleware being shown, but the code was using `express-winston`. Updated the text and install command to name `express-winston` and include `express`.
- The trace correlation example commented that `serviceContext` automatically extracts request trace headers. `serviceContext` is for Error Reporting context, while trace correlation is done through trace metadata, the trace agent, or the library's own Express middleware. Updated the comment.
- The shutdown section implied a guaranteed flush of all pending log entries. The library documents limitations around waiting for Winston 3 logs to be written, so the comment now says this gives the transport a chance to send pending asynchronous entries.

## Review Notes
The `@google-cloud/logging-winston` package also provides its own experimental Express middleware through `express.makeMiddleware`, which can perform request bundling and trace correlation. The post's `express-winston` approach is still valid after the wording correction, but a future revision could mention the built-in middleware as an alternative.
