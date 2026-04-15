# How to Use stochasticLogisticRegression() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Logistic Regression, Machine Learning

Description: Learn how to use stochasticLogisticRegression() in ClickHouse for binary classification, storing models in AggregatingMergeTree and predicting with evalMLMethod().

---

Binary classification - distinguishing failures from successes, spam from legitimate traffic, anomalous requests from normal ones - is a foundational machine learning task. ClickHouse's `stochasticLogisticRegression()` implements SGD-trained logistic regression as an aggregate function, storing the model state in an `AggregatingMergeTree` table and applying it to new observations via `evalMLMethod()`. This allows the entire training and inference pipeline to live inside ClickHouse, co-located with your event data.

## How stochasticLogisticRegression() Works

Logistic regression applies a sigmoid function to a linear combination of features to produce a probability between 0 and 1. ClickHouse trains it using stochastic gradient descent with binary cross-entropy loss. The label column must contain values 0 or 1.

```sql
stochasticLogisticRegression(
    learning_rate,
    l2_regularization,
    mini_batch_size,
    gradient_descent_strategy
)(label, feature1, feature2, ...)
```

The result is an opaque model state compatible with `AggregatingMergeTree` and `evalMLMethod()`.

## Setting Up the Model Table

```sql
-- Store binary classifier model for predicting request failures
CREATE TABLE failure_classifier
(
    model_date  Date,
    service     String,
    weights     AggregateFunction(
                    stochasticLogisticRegression(0.01, 0.001, 64, 'SGD'),
                    UInt8,                      -- label (0 or 1)
                    Float64, Float64, Float64   -- features
                )
)
ENGINE = AggregatingMergeTree()
ORDER BY (model_date, service);
```

## Training via a Materialized View

```sql
-- Train continuously as new labeled requests arrive
CREATE MATERIALIZED VIEW mv_failure_classifier
TO failure_classifier
AS
SELECT
    toDate(timestamp)   AS model_date,
    service_name        AS service,
    stochasticLogisticRegressionState(0.01, 0.001, 64, 'SGD')(
        toUInt8(status_code >= 500),    -- label: 1 = failure, 0 = success
        toFloat64(cpu_percent),
        toFloat64(concurrent_requests),
        toFloat64(response_time_ms)
    ) AS weights
FROM request_logs
JOIN host_metrics USING (host_name)
GROUP BY model_date, service;
```

## Historical Training with INSERT INTO ... SELECT

```sql
-- Train on the past 30 days for a specific service
INSERT INTO failure_classifier
SELECT
    toDate(timestamp)   AS model_date,
    service_name        AS service,
    stochasticLogisticRegressionState(0.01, 0.001, 64, 'Momentum')(
        toUInt8(status_code >= 500),
        toFloat64(cpu_percent),
        toFloat64(concurrent_requests),
        toFloat64(response_time_ms)
    ) AS weights
FROM request_logs
JOIN host_metrics USING (host_name)
WHERE log_date >= today() - 30
GROUP BY model_date, service;
```

## Predicting Failure Probability with evalMLMethod()

`evalMLMethod()` applies the trained model weights to a feature vector and returns the predicted probability (0 to 1 for logistic regression).

```sql
-- Score incoming requests for failure probability
SELECT
    r.request_id,
    r.service_name,
    r.endpoint,
    r.status_code,
    round(evalMLMethod(
        m.weights_merged,
        toFloat64(h.cpu_percent),
        toFloat64(r.concurrent_requests),
        toFloat64(r.response_time_ms)
    ), 4) AS failure_probability
FROM request_logs AS r
JOIN host_metrics AS h USING (host_name)
JOIN (
    SELECT
        service,
        stochasticLogisticRegressionMerge(0.01, 0.001, 64, 'SGD')(weights)
            AS weights_merged
    FROM failure_classifier
    WHERE model_date = today() - 1
    GROUP BY service
) AS m ON r.service_name = m.service
WHERE r.log_date = today()
ORDER BY failure_probability DESC
LIMIT 100;
```

## Applying a Classification Threshold

The raw output of `evalMLMethod()` is a probability. Apply a threshold (commonly 0.5) to produce a binary prediction.

```sql
-- Classify requests as predicted-failure or predicted-success
SELECT
    request_id,
    service_name,
    failure_probability,
    if(failure_probability >= 0.5, 'predicted_failure', 'predicted_success') AS prediction,
    if(status_code >= 500, 'actual_failure', 'actual_success') AS actual_label
FROM (
    SELECT
        r.request_id,
        r.service_name,
        r.status_code,
        evalMLMethod(
            m.weights_merged,
            toFloat64(h.cpu_percent),
            toFloat64(r.concurrent_requests),
            toFloat64(r.response_time_ms)
        ) AS failure_probability
    FROM request_logs AS r
    JOIN host_metrics AS h USING (host_name)
    JOIN (
        SELECT
            service,
            stochasticLogisticRegressionMerge(0.01, 0.001, 64, 'SGD')(weights)
                AS weights_merged
        FROM failure_classifier
        WHERE model_date = today() - 2
        GROUP BY service
    ) AS m ON r.service_name = m.service
    WHERE r.log_date = today() - 1
)
LIMIT 1000;
```

## Evaluating Model Performance

```sql
-- Compute precision, recall, and accuracy on a validation set
SELECT
    countIf(prediction = 1 AND actual = 1) AS true_positives,
    countIf(prediction = 1 AND actual = 0) AS false_positives,
    countIf(prediction = 0 AND actual = 1) AS false_negatives,
    countIf(prediction = 0 AND actual = 0) AS true_negatives,
    round(
        countIf(prediction = actual) / count(),
        4
    ) AS accuracy,
    round(
        countIf(prediction = 1 AND actual = 1) /
        nullIf(countIf(prediction = 1), 0),
        4
    ) AS precision,
    round(
        countIf(prediction = 1 AND actual = 1) /
        nullIf(countIf(actual = 1), 0),
        4
    ) AS recall
FROM (
    SELECT
        if(failure_probability >= 0.5, 1, 0) AS prediction,
        toUInt8(status_code >= 500)           AS actual
    FROM (
        SELECT
            r.status_code,
            evalMLMethod(
                m.weights_merged,
                toFloat64(h.cpu_percent),
                toFloat64(r.concurrent_requests),
                toFloat64(r.response_time_ms)
            ) AS failure_probability
        FROM request_logs AS r
        JOIN host_metrics AS h USING (host_name)
        JOIN (
            SELECT
                service,
                stochasticLogisticRegressionMerge(0.01, 0.001, 64, 'SGD')(weights)
                    AS weights_merged
            FROM failure_classifier
            WHERE model_date = today() - 3
            GROUP BY service
        ) AS m ON r.service_name = m.service
        WHERE r.log_date = today() - 2
          AND r.service_name = 'api-gateway'
    )
);
```

## Choosing Hyperparameters

```sql
-- Compare model states trained with different strategies
-- Train with Nesterov momentum for faster convergence
INSERT INTO failure_classifier
SELECT
    toDate(timestamp)  AS model_date,
    service_name       AS service,
    stochasticLogisticRegressionState(0.005, 0.0001, 128, 'Nesterov')(
        toUInt8(status_code >= 500),
        toFloat64(cpu_percent),
        toFloat64(concurrent_requests),
        toFloat64(response_time_ms)
    ) AS weights
FROM request_logs
JOIN host_metrics USING (host_name)
WHERE log_date = today() - 1
GROUP BY model_date, service;
```

Guidance:
- `learning_rate`: start at 0.01; reduce if loss oscillates.
- `l2_regularization`: use 0.001 as default; increase for high-dimensional feature spaces.
- `mini_batch_size`: 64 is a good default; larger values are more stable on imbalanced datasets.
- `gradient_descent_strategy`: `'Nesterov'` typically converges faster than plain `'SGD'`.

## Summary

`stochasticLogisticRegression()` brings SGD-trained binary classification into ClickHouse as a first-class aggregate function. Models are stored as mergeable states in `AggregatingMergeTree`, updated continuously via materialized views, and scored in real time using `evalMLMethod()`. This pattern eliminates the need for an external ML serving layer for operational classification tasks such as predicting request failures, flagging anomalous traffic, or classifying events - all using data already resident in ClickHouse.
