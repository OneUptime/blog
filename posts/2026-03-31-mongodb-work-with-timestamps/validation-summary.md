# Validation Summary: How to Work with Timestamps in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (BSON types, oplog, mongosh)
- BSON Timestamp type (type 17)
- BSON Date type (type 9)
- MongoDB replication oplog
- MongoDB `$currentDate` update operator
- MongoDB `$type` query operator

## Sources Consulted
- MongoDB BSON Types documentation: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB Timestamp() constructor reference: https://www.mongodb.com/docs/manual/reference/method/Timestamp/
- MongoDB $currentDate operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/currentDate/
- MongoDB $type query operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/type/
- MongoDB Oplog documentation: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- BSON specification: https://bsonspec.org/spec.html

## Issues Found
1. **`new Timestamp()` incorrectly described as returning current time**: The post stated `new Timestamp()` produces a timestamp with the current time (showing `Timestamp({ t: 1718444400, i: 1 })` as output). In mongosh, `new Timestamp()` with no arguments actually returns `Timestamp({ t: 0, i: 0 })`. The zero-valued timestamp has special server-side behavior: when inserted as a top-level document field, MongoDB replaces it with the current timestamp. But the client-side constructor itself returns a zero timestamp. Fixed the comment and output to reflect the actual behavior, and added a note about the server-side auto-replacement.

## Review Notes
- The BSON type numbers (Date = 9, Timestamp = 17) are correct.
- The Timestamp bit layout description (seconds in upper 32 bits, ordinal in lower 32 bits) is correct per the BSON specification.
- The `$currentDate` usage with both `true` (Date) and `{ $type: "timestamp" }` (Timestamp) is correct.
- The `$type` query string aliases ("timestamp" and "date") are correct.
- The oplog query pattern using `local.oplog.rs` is correct.
- The CDC checkpoint pattern shown is a valid real-world use case for BSON Timestamps.
