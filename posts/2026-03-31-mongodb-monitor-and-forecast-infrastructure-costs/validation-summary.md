# Validation Summary: How to Monitor and Forecast MongoDB Infrastructure Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Admin API v1.0 (Billing endpoints)
- Python (requests library with HTTPDigestAuth)
- mongosh (MongoDB Shell) JavaScript
- curl with HTTP Digest Authentication
- CSV export for dashboards

## Sources Consulted
- MongoDB Atlas Admin API v1.0 documentation — Invoices endpoints: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/
- MongoDB Atlas Admin API — Alert Configurations: https://www.mongodb.com/docs/atlas/reference/api/alert-configurations/
- MongoDB Atlas Billing documentation: https://www.mongodb.com/docs/atlas/billing/
- Python `requests` library documentation — HTTPDigestAuth: https://docs.python-requests.org/en/latest/user/authentication/#digest-authentication
- mongosh documentation — db.collection.stats(): https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- mongosh documentation — db.getCollectionNames(): https://www.mongodb.com/docs/manual/reference/method/db.getCollectionNames/

## Issues Found

1. **Python auth used Basic Auth instead of Digest Auth (Steps 2 & 3):** The code used `AUTH = ("PUBLIC_KEY", "PRIVATE_KEY")` passed to `requests.get(..., auth=AUTH)`. A plain tuple triggers Basic Authentication in the `requests` library, but the MongoDB Atlas Admin API requires HTTP Digest Authentication. Fixed by importing `HTTPDigestAuth` from `requests.auth` and changing `AUTH` to `HTTPDigestAuth("PUBLIC_KEY", "PRIVATE_KEY")`. Also removed the unused `from datetime import datetime, timedelta` import.

2. **Invalid alert event type name (Step 6):** The `eventTypeName` was set to `"BILLING_ABOVE"`, which is not a valid Atlas alert event type. Changed to `"PENDING_INVOICE_OVER_THRESHOLD"`, which is the documented event type for triggering alerts when the pending invoice amount exceeds a specified threshold.

## Review Notes
- The `db.collection.stats()` method used in Step 4 (mongosh code) is deprecated since MongoDB 6.2 in favor of the `$collStats` aggregation stage. It still works in all current versions but may be removed in a future major release. Readers on MongoDB 6.2+ should be aware of this.
- The mongosh code in Step 4 does not filter out system collections (e.g., `system.views`) from `db.getCollectionNames()`. Calling `.stats()` on system collections could produce unexpected results. A `.filter(c => !c.startsWith("system."))` would be a defensive improvement.
- The Atlas Admin API v1.0 used throughout the post is the older API version. MongoDB has introduced v2 (`/api/atlas/v2/`). The v1.0 endpoints still work but readers should be aware that v2 is the current recommended version.
- The compound growth model in Step 5 is mathematically correct and a reasonable simple forecasting approach, though real-world Atlas costs may not follow uniform exponential growth.
