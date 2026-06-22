# Validation Summary: How to Process POST Data in Express.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express.js
- Express body parsing middleware
- HTTP POST request bodies
- URL-encoded form data
- multipart/form-data
- Multer
- fast-xml-parser
- Joi
- Stripe webhooks
- GitHub webhooks
- curl

## Sources Consulted
- Express body-parser middleware documentation: https://expressjs.com/en/resources/middleware/body-parser/
- Express Multer middleware documentation: https://expressjs.com/en/resources/middleware/multer/
- Joi API reference: https://joi.dev/api/
- fast-xml-parser package README: https://www.npmjs.com/package/fast-xml-parser
- Stripe webhook documentation: https://docs.stripe.com/webhooks
- GitHub validating webhook deliveries documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub webhook events and payloads documentation: https://docs.github.com/en/webhooks/webhook-events-and-payloads

## Issues Found
- The "Extended vs Simple Parsing" section said `extended: true` is the default for URL-encoded parsing. Current body-parser documentation says the `extended` option defaults to `false`, so I changed the comment to describe `extended: true` without calling it the default.
- The XML parsing example used `const xmlParser = require('fast-xml-parser'); const parsed = xmlParser.parse(req.body);`, which does not match the current fast-xml-parser CommonJS API. I changed it to import `XMLParser`, instantiate it, and call `parser.parse(req.body)`.

## Review Notes
The examples are tutorial snippets and assume surrounding setup for dependencies such as `sharp`, `s3`, `stripe`, and `crypto` where those services are demonstrated. For production webhook signature comparisons, future improvements could mention timing-safe comparison helpers, but the existing examples are directionally correct for explaining raw-body access.
