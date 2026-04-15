# Validation Summary: How to Use stochasticLinearRegression() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- `stochasticLinearRegression()` aggregate function
- `evalMLMethod()` for ML inference
- AggregatingMergeTree engine
- Materialized views for incremental model training
- Stochastic gradient descent (SGD, Adam, Momentum, Nesterov)

## Sources Consulted
- ClickHouse official documentation: stochasticLinearRegression — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/stochasticlinearregression
- ClickHouse official documentation: Aggregate Function Combinators (-State, -Merge, -MergeState) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse official documentation: evalMLMethod — https://clickhouse.com/docs/en/sql-reference/functions/machine-learning-functions

## Issues Found

### 1. Target variable in wrong position (critical — all training examples)
**What was wrong:** Every call to `stochasticLinearRegressionState(...)` placed the target variable (`response_time_ms`) as the **last** argument. The ClickHouse documentation explicitly states: "the column with target value is inserted as the first argument."
**What was changed:** Moved the target variable to be the first argument in all four training code blocks (materialized view, batch training, hyperparameter experiment) and updated the generic function signature.
**Why:** Passing the target in the wrong position would cause the model to train on the wrong column, producing incorrect predictions.

### 2. Incorrect -Merge combinator usage (critical — both prediction examples)
**What was wrong:** The blog used `stochasticLinearRegressionMerge(0.01, 0.001, 64, 'SGD')(weights)` in two places. This had two problems: (a) the `-Merge` combinator does not take hyperparameters — those are encoded in the `AggregateFunction` column type, and (b) `-Merge` finalizes the aggregation and returns the result value, but `evalMLMethod()` requires an `AggregateFunctionState` object, not a finalized result.
**What was changed:** Replaced with `stochasticLinearRegressionMergeState(weights)` — the `-MergeState` combinator merges intermediate states while preserving the state type, which `evalMLMethod()` can consume.
**Why:** Using `-Merge` would either error due to the extra parameters or return a finalized value incompatible with `evalMLMethod()`.

### 3. Missing Adam gradient descent strategy
**What was wrong:** The blog listed only `'SGD'`, `'Momentum'`, and `'Nesterov'` as valid strategies. The ClickHouse documentation lists `'Adam'` as a fourth option and notes it is the **default** method.
**What was changed:** Added `'Adam'` (default) to the strategies list in the introductory description and in the hyperparameters reference section.
**Why:** Omitting the default strategy could mislead readers about what method is used when no strategy is specified.

### 4. AggregateFunction type declaration argument order
**What was wrong:** The `CREATE TABLE` statement listed `Float64, Float64, Float64` (features) before the final `Float64` (target) in the `AggregateFunction(...)` type, which must match the function's argument order.
**What was changed:** Reordered to `Float64` (target) first, then `Float64, Float64, Float64` (features), with updated comments.
**Why:** The type signature must match the argument order used in `-State` calls for ClickHouse to correctly interpret the stored aggregate state.

## Review Notes
- The batch training example uses `'Momentum'` while the model table and other examples use `'SGD'`. This is technically valid (the -MergeState combinator can merge states regardless of original strategy), but readers should be aware that mixing strategies across training batches may produce unpredictable convergence behavior.
- The `evalMLMethod()` feature arguments must match the order of features used during training (excluding the target). The blog is consistent about this across all examples.
- The overall architectural pattern (AggregatingMergeTree + materialized view + evalMLMethod) is well-documented and correct per ClickHouse's recommended approach for in-database ML.
