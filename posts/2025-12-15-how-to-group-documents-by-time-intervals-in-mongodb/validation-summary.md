# Validation Summary: How to Group Documents by Time Intervals in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB aggregation framework
- MongoDB date aggregation expressions
- MongoDB window functions
- MongoDB indexing
- JavaScript / mongosh examples

## Sources Consulted
- MongoDB Manual: `$dateTrunc` aggregation expression - https://www.mongodb.com/docs/manual/reference/operator/aggregation/datetrunc/
- MongoDB Manual: `$dateToString` aggregation expression - https://www.mongodb.com/docs/manual/reference/operator/aggregation/datetostring/
- MongoDB Manual: date part expressions including `$year`, `$month`, `$dayOfMonth`, `$hour`, `$isoWeek`, and `$isoWeekYear` - https://www.mongodb.com/docs/manual/reference/operator/aggregation/year/
- MongoDB Manual: `$dateAdd` aggregation expression - https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateadd/
- MongoDB Manual: `$dateDiff` aggregation expression - https://www.mongodb.com/docs/manual/reference/operator/aggregation/datediff/
- MongoDB Manual: `$range` aggregation expression - https://www.mongodb.com/docs/manual/reference/operator/aggregation/range/
- MongoDB Manual: `$group` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB Manual: `$setWindowFields` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/setwindowfields/
- MongoDB Manual: `$shift` window expression - https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/
- MongoDB Manual: `$densify` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/

## Issues Found
- The monthly summary example included `avgEventsPerDay: { $avg: 1 }` with a comment saying it would calculate later. In a `$group`, averaging the constant `1` always returns `1`, and the field was not used in the following `$project`. Removed the accumulator to avoid showing an incorrect metric.
- The ISO week example named `$min: "$timestamp"` and `$max: "$timestamp"` fields `firstDay` and `lastDay`. Those values are the first and last event timestamps in the group, not the calendar start and end dates of the ISO week. Renamed them to `firstEvent` and `lastEvent`.

## Review Notes
- The post correctly identifies `$dateTrunc` as a MongoDB 5.0+ expression and uses valid `unit`, `binSize`, `timezone`, and `startOfWeek` options.
- The gap-filling example is technically valid for MongoDB 5.0+ because it uses `$dateDiff` and `$dateAdd`. For MongoDB 5.1+, `$densify` is an official purpose-built option for filling missing time-series buckets and could be mentioned in a future enhancement.
