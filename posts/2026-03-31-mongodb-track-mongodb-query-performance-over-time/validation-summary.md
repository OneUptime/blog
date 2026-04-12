# Validation Summary: How to Track MongoDB Query Performance Over Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (profiler, system.profile collection, aggregation framework, explain())
- Python (PyMongo driver)
- Prometheus (prometheus_client Python library)

## Sources Consulted
- MongoDB documentation on database profiler: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB documentation on system.profile: https://www.mongodb.com/docs/manual/reference/database-profiler/
- mongosh cursor methods documentation: https://www.mongodb.com/docs/manual/reference/method/js-cursor/
- MongoDB explain() documentation: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/
- Prometheus Python client documentation: https://prometheus.github.io/client_python/

## Issues Found
1. **Incorrect cursor method `.projection()` changed to `.project()`**: In the "Querying the system.profile Collection" section, the code used `.projection()` chained on a find cursor. This method does not exist on cursors in mongosh or the legacy mongo shell. The correct cursor method is `.project()`. Fixed by replacing `.projection({` with `.project({`.

## Review Notes
- The Python script uses `datetime.utcnow()`, which is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. It still works and is widely used, so this is not an error, but authors may want to update it for forward compatibility.
- The "Storing Historical Query Metrics" section describes exporting to a "time-series collection," but the code creates a regular collection via `insert_many`. True MongoDB time-series collections require explicit creation with `db.createCollection()` and a `timeseries` option. The code works correctly as-is for storing historical data; the phrasing is slightly imprecise.
- The Prometheus snippet references a `slow_queries` variable that is not defined within that code block. This is understood as a continuation from the previous section, but readers may need to connect the two snippets themselves.
