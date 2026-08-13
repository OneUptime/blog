# Diagnose a Spark Many-to-Many Join That Explodes Row Count

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Spark SQL, Joins, Data Quality, Cardinality, PySpark

Description: Predict and diagnose Spark join fanout per key, distinguish valid many-to-many output from faulty keys, and enforce the intended data contract before joining.

---

A Spark join does not silently invent rows. For an inner equi-join, every matching left row is paired with every matching right row. If key `K` appears `L` times on the left and `R` times on the right, that key contributes `L × R` output rows. A key repeated 10,000 times on both sides produces 100 million matches even though each input contains only 10,000 rows for that key.

The surprise comes from an unstated cardinality assumption: someone expected one-to-one or many-to-one data, while the physical data is many-to-many.

## Predict Fanout Before Running the Full Join

Profile multiplicity on both sides with the *exact normalized join expressions*. If the production join trims, casts, or combines columns, apply those transformations before counting.

```python
from pyspark.sql import functions as F

left_counts = (
    orders
    .groupBy("customer_id")
    .agg(F.count(F.lit(1)).alias("left_rows"))
)

right_counts = (
    customer_versions
    .groupBy("customer_id")
    .agg(F.count(F.lit(1)).alias("right_rows"))
)

fanout = (
    left_counts
    .join(right_counts, "customer_id", "inner")
    .withColumn("expected_rows", F.col("left_rows") * F.col("right_rows"))
)

fanout.orderBy(F.desc("expected_rows")).show(50, truncate=False)

fanout.agg(
    F.sum("expected_rows").alias("predicted_inner_join_rows")
).show()
```

This distributes the counting rather than collecting raw keys to the driver. At extreme scales, choose a numeric type that cannot overflow your expected product. The calculation predicts ordinary equality matches; outer joins, null-safe equality, additional predicates, and non-equi conditions require the corresponding cardinality formula.

Also identify violations of the intended contract:

```python
duplicate_dimension_keys = (
    customer_versions
    .groupBy("customer_id")
    .count()
    .where(F.col("count") > 1)
)
```

If the right side is supposed to be unique, any result is a data-quality failure even before it becomes a performance problem.

## Check the Join Predicate Itself

Common causes of unintended many-to-many behavior include:

- joining a versioned dimension by entity ID but omitting effective-time conditions;
- joining line items to payments on order ID when both contain several rows per order;
- dropping part of a composite key during a refactor;
- normalizing distinct raw identifiers to the same value;
- using an `OR` condition that admits multiple matches;
- performing an explicit cross join or a join with an accidentally broad expression.

Print the physical plan and review the code that builds the condition:

```python
candidate.explain(mode="formatted")
```

The SQL join reference defines join criteria separately from the join type. Do not assume that identically named columns beyond the specified `on` list are automatically included. With `DataFrame.join(other, ["a", "b"])`, the named columns form the equi-join key. With a Boolean expression, only that expression controls matching.

Null behavior also matters. Standard equality follows Spark SQL null semantics: `NULL = NULL` is not true. Null-safe equality (`<=>` in SQL or `eqNullSafe` in the Column API) can match nulls, which may create a very large null-key group if used deliberately. Make the null policy explicit.

## Decide Whether the Multiplication Is Correct

Many-to-many output can be valid. A product-to-promotion bridge joined with regional eligibility may genuinely require every combination. In that case, do not “fix” it by arbitrary deduplication. Instead, budget for the output, filter early, partition adequately, and consider materializing a purpose-built bridge table.

If the multiplication is invalid, state the desired contract:

- **one-to-one:** both sides unique by the join key;
- **many-to-one:** the right side unique;
- **one-to-many:** the left side unique;
- **existence only:** return left rows for which any right match exists;
- **as-of match:** select the one version valid at the left row's event time.

The fix follows the contract, not a generic Spark setting.

## Apply a Semantic Fix

### Enforce a deterministic dimension row

For “latest record wins,” define a complete tie-breaking order and retain exactly one row per key:

```python
from pyspark.sql.window import Window

w = Window.partitionBy("customer_id").orderBy(
    F.col("effective_at").desc(),
    F.col("ingested_at").desc(),
    F.col("record_id").desc(),
)

current_customer = (
    customer_versions
    .withColumn("rn", F.row_number().over(w))
    .where(F.col("rn") == 1)
    .drop("rn")
)
```

`dropDuplicates(["customer_id"])` does not express which version is correct. Use it only when rows are semantically interchangeable for the downstream result.

### Aggregate before joining

If the query needs payment total per order rather than every payment row paired with every line item, aggregate first:

```python
payment_totals = payments.groupBy("order_id").agg(
    F.sum("amount").alias("paid_amount")
)

enriched = orders.join(payment_totals, "order_id", "left")
```

Confirm that aggregation is algebraically valid for the business question. Pre-aggregating both sides can destroy needed detail.

### Use a semi join for existence

When right-side columns are not needed, a left-semi join returns qualifying left rows without producing one result per right match:

```python
eligible_orders = orders.join(eligible_customers, "customer_id", "left_semi")
```

### Complete the temporal predicate

Versioned data often requires inequalities in addition to an ID:

```python
condition = (
    (orders.customer_id == customer_versions.customer_id)
    & (orders.ordered_at >= customer_versions.valid_from)
    & (
        customer_versions.valid_to.isNull()
        | (orders.ordered_at < customer_versions.valid_to)
    )
)
```

Overlapping validity intervals can still produce multiple matches, so validate interval integrity separately.

## Observe the Explosion in Spark

In the SQL UI, compare input and output row metrics around the join node. In the associated stages, look for huge shuffle records, spill, peak execution memory, and long-tail tasks. A hot many-to-many key causes both cardinality explosion and partition skew because all equal keys typically meet in the same join partition.

AQE may split qualifying skewed sort-merge join partitions to improve execution, but it cannot remove logically valid output combinations. More executors, more partitions, or broadcast joins likewise do not correct a faulty cardinality contract.

Turn the contract into a pipeline check. Persist counts of duplicate keys, maximum multiplicity, predicted join rows, and actual output rows. Fail or quarantine the load when a supposedly unique dimension violates its key constraint. This catches the defect before the expensive join becomes the alarm.

## Reconcile Predicted and Actual Rows

For an inner equality join without extra predicates, the sum of `L × R` over matching non-null keys should reconcile with actual output. A mismatch is useful evidence: the production condition includes casts or additional predicates, null-safe matching is involved, the profile used a different snapshot, or arithmetic overflowed. For outer joins, add unmatched-side contributions according to the join type.

Make this reconciliation a bounded aggregate, not a second raw-data export. Store the predicted count, actual count, top fanout keys, and input snapshot identifiers with the run. When growth is legitimate, set a capacity guardrail on predicted output before executing the full join. When a uniqueness contract exists, fail on duplicate dimension keys directly; an output-row threshold alone may catch the defect only after data volume becomes expensive.

Sampling is useful for finding example rows but unreliable for proving rare duplicate keys absent. Exact uniqueness checks cost a shuffle, yet that cost is normally smaller and more interpretable than an uncontrolled join explosion. For very large routine pipelines, maintain uniqueness at the table-ingestion boundary so every consumer does not rediscover it.

## Official Documentation

- [Spark SQL Join Syntax](https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-join.html)
- [PySpark DataFrame `join()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.join.html)
- [Spark SQL Null Semantics](https://spark.apache.org/docs/latest/sql-ref-null-semantics.html)
- [PySpark Column `eqNullSafe()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.Column.eqNullSafe.html)
- [PySpark DataFrame `dropDuplicates()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.dropDuplicates.html)
- [Spark SQL Performance Tuning: AQE Skew Join](https://spark.apache.org/docs/latest/sql-performance-tuning.html#optimizing-skew-join)
- [PySpark DataFrame `explain()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html)
- [Spark Web UI: SQL and Stage Metrics](https://spark.apache.org/docs/latest/web-ui.html)

## Conclusion

Explain join growth per key: left multiplicity times right multiplicity. Profile those counts using the exact join expressions, review the predicate, and decide the intended cardinality before tuning Spark. Then enforce a deterministic unique row, aggregate, use a semi join, or complete the temporal condition as the data contract requires. AQE can execute a valid large join more efficiently; it cannot decide that valid combinations were unwanted.
