# Validation Summary: How to Use $bucket and $bucketAuto in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$bucket` aggregation stage
- `$bucketAuto` aggregation stage
- `$facet` aggregation stage

## Sources Consulted
- MongoDB Manual: `$bucket` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- MongoDB Manual: `$bucketAuto` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucketAuto/
- MongoDB Manual: `$facet` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB Manual: Preferred Numbers (granularity) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucketAuto/#granularity

## Issues Found

1. **Example 2 — incorrect boundary range in text**: The prose said "fall outside boundaries `[0, 1500]`" but the code uses boundaries `[100, 500, 1500]`, so the covered range is `[100, 1500)`. Fixed the text to reference `[100, 1500]`.

2. **Example 2 — "AND" should be "OR" in code comment**: The comment on the `default` field said `// catches values < 100 AND >= 1500`. A single value cannot simultaneously be less than 100 and greater than or equal to 1500. The default bucket catches values that fall below the lowest boundary OR at/above the highest boundary. Fixed to "OR".

3. **Example 3 — incorrect `$bucketAuto` output boundaries and avgPrice**: The output showed `{min: 5, max: 75}` for the first bucket with count 3, but with `[min, max)` semantics only prices 5 and 25 fall in `[5, 75)` (count 2). For the 3-2-3 distribution shown (counts 3, 2, 3), the correct boundaries are `{min: 5, max: 150}`, `{min: 150, max: 450}`, `{min: 450, max: 1200}`. This also corrected the second bucket's avgPrice from 262.5 to 250 (the average of 150 and 350).

## Review Notes
- The introductory text says `$bucket` works "based on a numeric field." While all examples use numeric fields, `$bucket` also supports other orderable types such as dates. This is not incorrect for the scope of this tutorial but could be clarified in a future update.
- The `$bucketAuto` output shown is a plausible distribution for 8 documents into 3 buckets, but actual MongoDB output may vary depending on server version and internal algorithm. The corrected output is self-consistent and representative.
