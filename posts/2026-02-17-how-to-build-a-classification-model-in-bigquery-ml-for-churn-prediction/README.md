# How to Build a Classification Model in BigQuery ML for Churn Prediction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, BigQuery ML, Machine Learning, Churn Prediction

Description: Learn how to build a logistic regression classification model in BigQuery ML to predict customer churn without leaving your data warehouse.

---

Customer churn is one of the most impactful metrics for subscription-based businesses. Knowing which customers are likely to leave gives you the chance to intervene before they actually do. Traditionally, building a churn prediction model meant exporting data from your warehouse, setting up a separate ML environment, training a model, and then somehow getting predictions back into a usable format. BigQuery ML eliminates most of that friction by letting you train and predict directly inside BigQuery using standard SQL.

In this post, I will walk through building a classification model for churn prediction using BigQuery ML - from data preparation to model evaluation and making predictions.

## Why BigQuery ML for Churn Prediction

BigQuery ML is a good fit for churn prediction for several practical reasons. Your customer data is probably already in BigQuery if you are on GCP. Training a model in place means you skip the data export step entirely. You also do not need to learn a separate ML framework - if you know SQL, you can build models. For many churn use cases, a logistic regression model trained on behavioral features is more than adequate, and that is exactly what BigQuery ML handles well.

## Preparing the Training Data

Before building a model, you need a table that has one row per customer with features that might predict churn and a label column indicating whether the customer churned. Here is an example of how you might construct such a table from raw event data.

This query builds a training dataset by aggregating customer behavior over the past 90 days and joining it with a known churn label.

```sql
-- Build a training dataset from customer activity and churn labels
CREATE OR REPLACE TABLE `my_project.churn_dataset.training_data` AS
SELECT
  c.customer_id,
  c.signup_date,
  -- Calculate days since the customer signed up
  DATE_DIFF(CURRENT_DATE(), c.signup_date, DAY) AS account_age_days,
  -- Aggregate usage metrics from the last 90 days
  COALESCE(SUM(e.login_count), 0) AS total_logins_90d,
  COALESCE(SUM(e.feature_usage_count), 0) AS total_feature_uses_90d,
  COALESCE(AVG(e.session_duration_seconds), 0) AS avg_session_duration_90d,
  -- Count support tickets as a potential churn signal
  COALESCE(t.ticket_count, 0) AS support_tickets_90d,
  -- The label: 1 if the customer churned, 0 otherwise
  CASE WHEN c.status = 'churned' THEN 1 ELSE 0 END AS churned
FROM
  `my_project.churn_dataset.customers` c
LEFT JOIN
  `my_project.churn_dataset.events_90d` e ON c.customer_id = e.customer_id
LEFT JOIN (
  SELECT customer_id, COUNT(*) AS ticket_count
  FROM `my_project.churn_dataset.support_tickets`
  WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
  GROUP BY customer_id
) t ON c.customer_id = t.customer_id
GROUP BY
  c.customer_id, c.signup_date, c.status, t.ticket_count;
```

A few things to note here. You want features that represent recent behavior since stale data will not predict near-term churn well. Login frequency, feature usage, session duration, and support ticket volume are commonly useful features. The label column needs to be an integer where 1 means churned and 0 means retained.

## Training the Classification Model

With the training data ready, creating a model is a single SQL statement. BigQuery ML supports several model types for classification, but logistic regression is a solid starting point.

This statement trains a logistic regression model on the training data, using the churned column as the label.

```sql
-- Train a logistic regression model for churn prediction
CREATE OR REPLACE MODEL `my_project.churn_dataset.churn_model`
OPTIONS(
  model_type='LOGISTIC_REG',
  -- Specify which column is the target label
  input_label_cols=['churned'],
  -- Enable automatic feature preprocessing
  auto_class_weights=TRUE,
  -- Set a reasonable number of training iterations
  max_iterations=20,
  -- Use L2 regularization to prevent overfitting
  l2_reg=0.1
) AS
SELECT
  account_age_days,
  total_logins_90d,
  total_feature_uses_90d,
  avg_session_duration_90d,
  support_tickets_90d,
  churned
FROM
  `my_project.churn_dataset.training_data`;
```

The `auto_class_weights=TRUE` option is important when your dataset is imbalanced, which churn datasets almost always are since most customers do not churn. This tells BigQuery ML to weight the minority class more heavily during training so the model does not just learn to predict "not churned" for everything.

## Evaluating the Model

After training, you want to check how well the model performs. BigQuery ML provides an evaluation function that returns standard classification metrics.

This query returns accuracy, precision, recall, and other metrics for the trained model.

```sql
-- Evaluate the churn prediction model
SELECT
  *
FROM
  ML.EVALUATE(MODEL `my_project.churn_dataset.churn_model`);
```

The output includes precision, recall, accuracy, f1_score, log_loss, and roc_auc. For churn prediction, pay close attention to recall - that is the proportion of actual churners the model correctly identified. A model with high accuracy but low recall might be missing most of the customers who will actually leave. An roc_auc score above 0.8 is generally a good result for this type of problem.

If you want to see the confusion matrix, you can run this.

```sql
-- Get the confusion matrix to see prediction breakdown
SELECT
  *
FROM
  ML.CONFUSION_MATRIX(MODEL `my_project.churn_dataset.churn_model`);
```

## Making Predictions

Once you are satisfied with the model performance, you can generate predictions for your current customer base.

This query scores all active customers and returns their predicted churn probability.

```sql
-- Predict churn probability for all active customers
SELECT
  customer_id,
  predicted_churned,
  -- Get the probability of churn (class 1)
  predicted_churned_probs[OFFSET(0)].prob AS churn_probability
FROM
  ML.PREDICT(MODEL `my_project.churn_dataset.churn_model`,
    (
      SELECT
        customer_id,
        account_age_days,
        total_logins_90d,
        total_feature_uses_90d,
        avg_session_duration_90d,
        support_tickets_90d
      FROM
        `my_project.churn_dataset.training_data`
      WHERE
        churned = 0  -- Only score active customers
    )
  )
ORDER BY
  churn_probability DESC;
```

The results give you a ranked list of customers by their likelihood of churning. You can use this to prioritize outreach efforts - maybe customers with a churn probability above 0.7 get a personal call from the account team, while those between 0.4 and 0.7 get a targeted email campaign.

## Understanding Feature Importance

BigQuery ML lets you inspect which features contributed most to the model's predictions. This is useful both for validating that the model makes sense and for informing product decisions.

This query returns the weight of each feature in the logistic regression model.

```sql
-- Check which features matter most for churn prediction
SELECT
  *
FROM
  ML.WEIGHTS(MODEL `my_project.churn_dataset.churn_model`)
ORDER BY
  ABS(weight) DESC;
```

If you see that low login counts and high support ticket counts are the strongest predictors, that aligns with intuition and gives your product team actionable information.

## Scheduling Regular Retraining

Customer behavior changes over time, so your model should be retrained periodically. You can schedule the training query to run weekly or monthly using BigQuery scheduled queries.

```sql
-- This would be set up as a scheduled query in BigQuery
-- to retrain the model on a regular cadence
CREATE OR REPLACE MODEL `my_project.churn_dataset.churn_model`
OPTIONS(
  model_type='LOGISTIC_REG',
  input_label_cols=['churned'],
  auto_class_weights=TRUE,
  max_iterations=20,
  l2_reg=0.1,
  -- Warm start uses the previous model weights as a starting point
  warm_start=TRUE
) AS
SELECT
  account_age_days,
  total_logins_90d,
  total_feature_uses_90d,
  avg_session_duration_90d,
  support_tickets_90d,
  churned
FROM
  `my_project.churn_dataset.training_data`;
```

The `warm_start=TRUE` option tells BigQuery ML to initialize the new model from the weights of the previous version, which can speed up training and provide more stable results when the underlying data distribution has not shifted dramatically.

## Beyond Logistic Regression

If logistic regression is not giving you the accuracy you need, BigQuery ML also supports boosted tree classifiers, which can capture nonlinear relationships between features.

```sql
-- Train a boosted tree model for potentially better accuracy
CREATE OR REPLACE MODEL `my_project.churn_dataset.churn_model_boosted`
OPTIONS(
  model_type='BOOSTED_TREE_CLASSIFIER',
  input_label_cols=['churned'],
  auto_class_weights=TRUE,
  num_parallel_tree=5,
  max_tree_depth=6
) AS
SELECT
  account_age_days,
  total_logins_90d,
  total_feature_uses_90d,
  avg_session_duration_90d,
  support_tickets_90d,
  churned
FROM
  `my_project.churn_dataset.training_data`;
```

Boosted trees tend to perform better on structured data like this, but they also take longer to train and are harder to interpret. Start with logistic regression, understand your data, and then move to boosted trees if you need the extra performance.

## Wrapping Up

Building a churn prediction model in BigQuery ML is refreshingly straightforward. You prepare your data in SQL, train the model in SQL, and generate predictions in SQL. There is no separate ML infrastructure to manage, no data exports to orchestrate, and no model serving endpoints to maintain. For many teams, this approach gets you 80% of the value of a custom ML pipeline with 20% of the effort. The key is starting with good features and iterating from there.
