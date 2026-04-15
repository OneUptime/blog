# How to Use stochasticLinearRegression() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Linear Regression, Machine Learning

Description: Learn how to use stochasticLinearRegression() in ClickHouse for online multi-feature linear regression, stored in AggregatingMergeTree for incremental updates.

---

While `simpleLinearRegression()` handles single-predictor OLS regression, real-world predictions often involve multiple features. ClickHouse's `stochasticLinearRegression()` implements stochastic gradient descent (SGD) for multi-feature linear regression as an aggregate function. The model state is stored in an `AggregatingMergeTree` table, updated incrementally as new data arrives, and applied using `evalMLMethod()` for inference - all without leaving ClickHouse.

## How stochasticLinearRegression() Works

The function uses mini-batch stochastic gradient descent to minimize the mean squared error of a linear model `y = w0 + w1*x1 + w2*x2 + ...`. You configure hyperparameters as function parameters:

```sql
stochasticLinearRegression(
    learning_rate,
    l2_regularization,
    mini_batch_size,
    gradient_descent_strategy
)(target, feature1, feature2, ...)
```

Common strategies for `gradient_descent_strategy` are `'Adam'` (default), `'SGD'`, `'Momentum'`, and `'Nesterov'`. The result is an opaque model state stored as `AggregateFunction(stochasticLinearRegression(...), ...)`.

## Setting Up a Model Table

```sql
-- Create a table to store the trained model state
CREATE TABLE latency_model
(
    model_date  Date,
    service     String,
    weights     AggregateFunction(
                    stochasticLinearRegression(0.01, 0.001, 64, 'SGD'),
                    Float64,                     -- target
                    Float64, Float64, Float64    -- features
                )
)
ENGINE = AggregatingMergeTree()
ORDER BY (model_date, service);
```

## Training via a Materialized View

```sql
-- Continuously train the model as new request data arrives
CREATE MATERIALIZED VIEW mv_latency_model
TO latency_model
AS
SELECT
    toDate(timestamp)   AS model_date,
    service_name        AS service,
    stochasticLinearRegressionState(0.01, 0.001, 64, 'SGD')(
        toFloat64(response_time_ms),        -- target variable (must be first)
        toFloat64(cpu_percent),
        toFloat64(memory_percent),
        toFloat64(concurrent_requests)
    ) AS weights
FROM request_logs
JOIN host_metrics USING (host_name)
GROUP BY model_date, service;
```

The materialized view updates `latency_model` incrementally with each new batch of rows, merging model states using `AggregatingMergeTree`'s merge logic.

## Batch Training with INSERT INTO ... SELECT

For historical backfill or one-off training runs:

```sql
INSERT INTO latency_model
SELECT
    toDate(timestamp)   AS model_date,
    service_name        AS service,
    stochasticLinearRegressionState(0.01, 0.001, 64, 'Momentum')(
        toFloat64(response_time_ms),        -- target variable (must be first)
        toFloat64(cpu_percent),
        toFloat64(memory_percent),
        toFloat64(concurrent_requests)
    ) AS weights
FROM request_logs
JOIN host_metrics USING (host_name)
WHERE log_date >= today() - 30
GROUP BY model_date, service;
```

## Making Predictions with evalMLMethod()

Once the model is trained, apply it to new feature vectors using `evalMLMethod()`.

```sql
-- Predict latency for current requests using the latest model
SELECT
    r.request_id,
    r.service_name,
    r.response_time_ms                         AS actual_latency,
    evalMLMethod(
        m.weights_merged,
        toFloat64(h.cpu_percent),
        toFloat64(h.memory_percent),
        toFloat64(r.concurrent_requests)
    )                                          AS predicted_latency
FROM request_logs AS r
JOIN host_metrics AS h USING (host_name)
JOIN (
    SELECT
        service,
        stochasticLinearRegressionMergeState(weights)
            AS weights_merged
    FROM latency_model
    WHERE model_date = today() - 1
    GROUP BY service
) AS m ON r.service_name = m.service
WHERE r.log_date = today()
LIMIT 1000;
```

## Choosing Hyperparameters

```sql
-- Experiment with different learning rates
-- Run each as a separate query and compare residuals
SELECT
    stochasticLinearRegressionState(0.001, 0.0001, 32, 'SGD')(
        toFloat64(response_time_ms),        -- target variable (must be first)
        toFloat64(cpu_percent),
        toFloat64(concurrent_requests)
    ) AS model_lr_0001
FROM request_logs
JOIN host_metrics USING (host_name)
WHERE log_date = today() - 1
  AND service_name = 'api-gateway';
```

Key parameters:
- `learning_rate` (0.001 - 0.1): larger values converge faster but may oscillate.
- `l2_regularization` (0 - 0.01): prevents overfitting on sparse features.
- `mini_batch_size` (16 - 512): larger batches are more stable, smaller batches update more frequently.
- `gradient_descent_strategy`: `'Adam'` is the default; `'SGD'` is simplest; `'Momentum'` and `'Nesterov'` converge faster.

## Evaluating Model Quality

After training, evaluate predictions against a holdout day:

```sql
-- Compute RMSE for the model on a validation day
SELECT
    service_name,
    sqrt(avg(pow(actual_latency - predicted_latency, 2))) AS rmse_ms,
    avg(abs(actual_latency - predicted_latency))           AS mae_ms
FROM (
    SELECT
        r.service_name,
        r.response_time_ms AS actual_latency,
        evalMLMethod(
            m.weights_merged,
            toFloat64(h.cpu_percent),
            toFloat64(h.memory_percent),
            toFloat64(r.concurrent_requests)
        ) AS predicted_latency
    FROM request_logs AS r
    JOIN host_metrics AS h USING (host_name)
    JOIN (
        SELECT
            service,
            stochasticLinearRegressionMergeState(weights)
                AS weights_merged
        FROM latency_model
        WHERE model_date = today() - 2
        GROUP BY service
    ) AS m ON r.service_name = m.service
    WHERE r.log_date = today() - 1
)
GROUP BY service_name
ORDER BY rmse_ms DESC;
```

## Summary

`stochasticLinearRegression()` enables multi-feature linear regression trained entirely inside ClickHouse using stochastic gradient descent. Models are stored as mergeable states in `AggregatingMergeTree`, updated continuously via materialized views, and applied to new data using `evalMLMethod()`. This pattern is well-suited for operational ML tasks like latency prediction, resource forecasting, and anomaly scoring where the features are already stored in ClickHouse and low-latency inference is required.
