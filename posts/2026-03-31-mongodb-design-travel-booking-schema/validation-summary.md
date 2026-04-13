# Validation Summary: How to Design a Travel Booking Schema in MongoDB

## Status
validated

## Post Type
Tutorial / Schema Design Guide

## Technologies Covered
- MongoDB (document model, indexes, GeoJSON, array queries)
- MongoDB Shell (mongosh) query and index syntax

## Sources Consulted
- MongoDB Manual: Query an Array of Embedded Documents — https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/
- MongoDB Manual: $elemMatch (query) — https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/
- MongoDB Manual: createIndex — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: 2dsphere Indexes — https://www.mongodb.com/docs/manual/core/2dsphere/
- MongoDB Manual: GeoJSON Objects — https://www.mongodb.com/docs/manual/reference/geojson/
- MongoDB Manual: Schema Design Patterns (Polymorphic Pattern) — https://www.mongodb.com/docs/manual/data-modeling/

## Issues Found

1. **Incorrect flight arrival time (data inconsistency)**: The `arrivalTime` was `"2026-04-01T11:15:00Z"` while `durationMinutes` was `375` (6h15m). The difference between departure (`08:00Z`) and arrival (`11:15Z`) is only 195 minutes (3h15m), not 375. Fixed `arrivalTime` to `"2026-04-01T14:15:00Z"` so the timestamps are consistent with the stated duration. A ~6 hour flight for JFK-LAX is realistic.

2. **Missing `$elemMatch` in flight availability query**: The query filtered on `"cabins.class": "economy"` and `"cabins.availableSeats": { $gt: 0 }` as separate top-level conditions. When querying multiple fields within array elements, MongoDB evaluates each condition independently across all array elements — so a flight could match if one cabin has `class: "economy"` (with 0 seats) and a different cabin has `availableSeats > 0`. Wrapped both conditions in `$elemMatch` to ensure they apply to the same array element.

## Review Notes
- The GeoJSON coordinates for Paris `[2.3522, 48.8566]` are correct (longitude, latitude order as required by MongoDB's GeoJSON format).
- The `2dsphere` index on `location.coordinates` is correctly paired with the GeoJSON `Point` type in the hotel document.
- The polymorphic pattern using a `type` discriminator field is a well-documented MongoDB schema design pattern.
- The hotel booking price is internally consistent: standard room at 18000 cents/night x 4 nights = 72000 cents total.
- The summary mentions using `$inc` with transactions to prevent double-booking, which is sound advice, though no code example is provided for this. This is acceptable as the post focuses on schema design rather than transaction implementation.
