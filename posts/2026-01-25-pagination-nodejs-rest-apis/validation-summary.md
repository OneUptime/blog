# Validation Summary: How to Create Pagination in Node.js REST APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express
- REST APIs
- Mongoose
- MongoDB
- Knex.js
- SQL pagination
- HTTP Link headers

## Sources Consulted
- Mongoose Query API documentation: https://mongoosejs.com/docs/api/query.html
- Knex.js Query Builder documentation: https://knexjs.org/guide/query-builder.html
- Express 5.x API Reference: https://expressjs.com/en/api/
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html
- MongoDB cursor.skip() documentation: https://www.mongodb.com/docs/manual/reference/method/cursor.skip/
- MongoDB createIndex() documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createindex/
- RFC 8288 Web Linking: https://datatracker.ietf.org/doc/html/rfc8288

## Issues Found
- The offset-pagination drawbacks said there was "No random access", but offset pagination does allow random access by page number; the problem is that deep pages are slow. Changed this to "Slow random access."
- The timestamp cursor example clamped the upper limit but did not enforce a minimum limit. Updated it to use the same `Math.max(1, ...)` lower-bound validation as the other examples.
- The simple cursor example described the cursor as a base64 encoded ID or timestamp, but the code compares the cursor against `_id`. Updated the comment to describe a base64 encoded ID.
- The reusable cursor pagination helper accepted arbitrary `sortField` values but only encoded and compared a single field, which can skip or duplicate records when sorting by a non-unique field such as `createdAt`. Updated it to include `_id` as a tie-breaker for non-`_id` sort fields and to encode/decode a JSON cursor containing both values.
- The response header example referenced RFC 5988 for `Link`; RFC 8288 is the current Web Linking specification. Updated the comment.
- The response header example parsed raw `page` and `limit` values without clamping them, so generated links could contain invalid values. Updated it to use the same validation pattern as the earlier examples.
- The `last` link could point to `page=0` when the result set was empty. Added a `lastPage` value that never drops below 1.

## Review Notes
- The examples use current Express, Node.js Buffer, Mongoose query, Knex query-builder, and MongoDB index APIs.
- The JavaScript snippets were syntax-checked individually with `node --check`.
- Cursor values are intentionally opaque to API clients; the article uses base64 encoding for clarity, but production APIs may also sign or otherwise protect cursors from client tampering.
