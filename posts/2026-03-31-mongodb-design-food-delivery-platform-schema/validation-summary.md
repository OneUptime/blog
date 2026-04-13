# Validation Summary: How to Design a Food Delivery Platform Schema in MongoDB

## Status
validated

## Post Type
Tutorial / Schema Design Guide

## Technologies Covered
- MongoDB (document model, schema design patterns)
- MongoDB 2dsphere geospatial indexes
- MongoDB `$near` geospatial query operator
- GeoJSON Point format

## Sources Consulted
- MongoDB Manual: 2dsphere Indexes — https://www.mongodb.com/docs/manual/core/2dsphere/
- MongoDB Manual: `$near` operator — https://www.mongodb.com/docs/manual/reference/operator/query/near/
- MongoDB Manual: `createIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- GeoJSON specification (RFC 7946) — coordinates use `[longitude, latitude]` order

## Issues Found

1. **Collection count mismatch in introduction**: The intro stated "five primary collections" and listed `deliveryTracking` as one of them, but only four collections (restaurants, menus, orders, drivers) were actually shown in the post. Fixed by changing "five" to "four" and removing `deliveryTracking` from the list.

2. **Order item price did not account for modifier**: The order example had `"modifier": "Large"` but `priceCents` was 1299 (the base Margherita price). Per the menu definition, the Large modifier adds 500 cents, so the correct unit price is 1799. Updated `priceCents` to 1799, `subtotalCents` to 3598 (2 x 1799), `taxCents` to 297, and `totalCents` to 4094 (3598 + 199 + 297) to maintain internal consistency.

## Review Notes
- All GeoJSON coordinates correctly use `[longitude, latitude]` order as required by MongoDB's 2dsphere indexes.
- The `$near` query correctly uses `$maxDistance` in meters (3000 = 3 km) which is the correct unit for 2dsphere indexes.
- The `createIndex` syntax and index definitions are all correct for current MongoDB versions.
- The schema design patterns (embedding menus for fast reads, referencing orders/drivers by ID, bounded statusHistory array, storing monetary values as integer cents) are all sound and follow MongoDB best practices.
- For production use, a compound index like `{ status: 1, "location.coordinates": "2dsphere" }` would be more efficient for the "find nearby open restaurants" query, but the article's separate indexes are still correct.
