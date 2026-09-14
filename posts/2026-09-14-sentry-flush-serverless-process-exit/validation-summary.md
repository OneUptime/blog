# Validation Summary: Flush Sentry Events Before Serverless Jobs and Processes Exit

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Sentry JavaScript SDK
- Node.js
- AWS Lambda
- `@sentry/node`
- `@sentry/aws-serverless`
- Serverless job lifecycle management

## Sources Consulted

- [Sentry JavaScript SDK Node APIs](https://docs.sentry.io/platforms/javascript/guides/node/apis/)
- [Sentry AWS Lambda wrapper configuration](https://docs.sentry.io/platforms/javascript/guides/aws-lambda/configuration/lambda-wrapper/)
- [Official `@sentry/aws-serverless` package](https://www.npmjs.com/package/@sentry/aws-serverless)
- [Node.js process documentation](https://nodejs.org/api/process.html)
- [AWS Lambda Node.js handler documentation](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html)

## Issues Found
No technical issues found.

## Review Notes
The examples use the current `@sentry/aws-serverless` package rather than the discontinued `@sentry/serverless` package. The Lambda wrapper's two-second default flush timeout, its per-invocation flush behavior, and the distinction between `flush()` and `close()` were checked against the current SDK documentation and package implementation. The guidance correctly notes that a completed SDK flush does not guarantee server-side ingestion or visibility, and that forced termination can still prevent delivery.
