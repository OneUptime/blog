# Validation Summary: How to Use TS.MGET in Redis Time Series for Multiple Keys

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis
- Redis Time Series (RedisTimeSeries module)
- TS.MGET command
- TS.CREATE, TS.ADD, TS.GET, TS.MRANGE (comparison)

## Sources Consulted
- Redis Time Series official documentation for TS.MGET: https://redis.io/commands/ts.mget/
- Redis Time Series official documentation for TS.MRANGE: https://redis.io/commands/ts.mrange/
- Redis Time Series label filtering documentation: https://redis.io/docs/latest/develop/data-types/timeseries/quickstart/
- Redis Time Series configuration and label index behavior

## Issues Found

1. **Mermaid diagram label mismatch**: The three series nodes in the diagram showed labels `building=hq room=101/102/103`, but the filter expression was `building=hq metric=temperature`. Since the series lacked a `metric=temperature` label, they would not match the filter. Fixed by changing the series labels to `building=hq metric=temperature` to match the filter.

2. **Incorrect terminology "well-cardinality"**: The Performance Considerations section used the non-standard term "well-cardinality labels." The correct and standard term is "low-cardinality." Fixed to "low-cardinality labels."

3. **Invalid relative timestamp in TS.MRANGE example**: The comparison section used `TS.MRANGE -60000 + FILTER ...` implying `-60000` is a relative timestamp (last 60 seconds). Redis Time Series does not support negative integers as relative timestamps — only `-` (minimum/earliest timestamp) and `+` (maximum/latest timestamp) are special symbols; integer values are always interpreted as absolute Unix timestamps in milliseconds. Changed to `TS.MRANGE - + FILTER ...` to show a valid full-range query.

## Review Notes
- The syntax, filter expression table, and all other command examples are accurate per current Redis Time Series documentation.
- The TS.CREATE LABELS syntax correctly uses space-separated key-value pairs.
- The output format examples correctly show the nested array structure returned by TS.MGET.
- The conceptual explanations of TS.MGET vs TS.GET and TS.MGET vs TS.MRANGE are accurate.
- The SELECTED_LABELS example references a `room` label that wasn't defined in prior examples, but since it's a standalone example this is acceptable.
