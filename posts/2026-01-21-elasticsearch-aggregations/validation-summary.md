# Validation Summary: How to Use Elasticsearch Aggregations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch
- Elasticsearch aggregations
- Elasticsearch Query DSL
- curl

## Sources Consulted
- Elasticsearch aggregations reference: https://www.elastic.co/docs/reference/aggregations/
- Terms aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
- Date histogram aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-datehistogram-aggregation
- Cumulative sum aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-pipeline-cumulative-sum-aggregation
- Derivative aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-pipeline-derivative-aggregation
- Moving function aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-pipeline-movfn-aggregation
- Bucket sort aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-pipeline-bucket-sort-aggregation
- Bucket script aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-pipeline-bucket-script-aggregation
- Elasticsearch _id field reference: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-id-field

## Issues Found
- String field aggregations and exact-match term queries used `category`, `customer_id`, and `status` directly. Updated the examples to use `.keyword` fields where exact values or aggregations are expected, matching Elasticsearch guidance that text fields are not suitable for terms aggregations by default.
- The dashboard example used `value_count` on `_id`. Current Elasticsearch restricts `_id` from aggregations, sorting, and scripting. Changed the order count metric to count the `amount` field instead.
- Pipeline aggregation examples using `date_histogram` omitted `min_doc_count: 0`, which the cumulative sum and derivative documentation requires for enclosing histograms. Added `min_doc_count: 0` to the relevant date histogram examples.
- The dashboard example named a `bucket_script` aggregation `percentage`, but its script returned the category revenue unchanged. Replaced it with an `avg_order_value` bucket script that uses both revenue and order count and returns a meaningful numeric pipeline metric.

## Review Notes
- The examples assume the `orders` index maps fields such as `category.keyword`, `customer_id.keyword`, and `status.keyword` with doc values enabled, which is the standard mapping pattern for exact-match aggregations.
- The bucket sort example is syntactically valid, but Elasticsearch runs `bucket_sort` after parent buckets are already selected. For very high-cardinality categories, increase the parent `terms.size` carefully or use a different approach when exact global top-N behavior is required.
