# Validation Summary: How to Store and Query UTC Dates in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (BSON Date type, query operators, aggregation framework)
- JavaScript / Node.js (native MongoDB driver, Date object, Intl API)
- Python / PyMongo (datetime module, timezone-aware datetimes)

## Sources Consulted
- MongoDB BSON Date type documentation: https://www.mongodb.com/docs/manual/reference/bson-types/#date
- MongoDB `$dateToString` aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/
- MongoDB `$dateToParts` aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToParts/
- MongoDB `explain()` documentation: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- Python `datetime` module documentation: https://docs.python.org/3/library/datetime.html
- MDN `Date.prototype.toLocaleString()`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString

## Issues Found
No technical issues found.

## Review Notes
- The Python example correctly uses `datetime.now(timezone.utc)` rather than the deprecated `datetime.utcnow()` (deprecated in Python 3.12). This is the recommended modern approach.
- The `$dateToString` `timezone` parameter requires MongoDB 3.6+. This is not called out in the post but is unlikely to be an issue given current MongoDB version adoption.
- The explanation that PyMongo stores naive datetimes "without UTC normalization" is accurate — PyMongo treats naive datetimes as UTC, so a naive local-time value will be stored with incorrect UTC representation.
