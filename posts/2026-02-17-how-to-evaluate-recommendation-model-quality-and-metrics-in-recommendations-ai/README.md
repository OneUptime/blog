# How to Evaluate Recommendation Model Quality and Metrics in Recommendations AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Recommendations AI, Model Evaluation, Metrics, Machine Learning

Description: Learn how to evaluate the quality of your Recommendations AI models using key metrics like precision, recall, CTR, and revenue impact to ensure optimal performance.

---

Building a recommendation model is one thing. Knowing whether it actually works well is another. You can have a model that returns results every time but recommends products nobody wants. Or a model that nails relevance for power users but fails completely for occasional shoppers. Evaluation is how you separate a good recommendation system from a bad one, and it should be an ongoing process, not a one-time check.

This guide covers the metrics you should track, how to access them in Recommendations AI, and how to set up your own evaluation framework.

## Key Metrics for Recommendation Quality

There are two categories of metrics to track: model metrics (how well the model predicts) and business metrics (how well recommendations impact your bottom line).

### Model Metrics

- **Precision at K**: Of the top K recommendations shown, what fraction were relevant (clicked/purchased)? Higher precision means fewer wasted recommendation slots.
- **Recall at K**: Of all relevant items for a user, what fraction appeared in the top K recommendations? Higher recall means the model covers more of the user's interests.
- **NDCG (Normalized Discounted Cumulative Gain)**: Measures how well the model ranks relevant items. Items the user actually wants should appear at the top, not buried at position 10.
- **Diversity**: How varied are the recommendations? A model that always recommends the same popular items scores low on diversity.
- **Coverage**: What percentage of your catalog gets recommended to at least one user? Low coverage means a large portion of your inventory is invisible.

### Business Metrics

- **Click-Through Rate (CTR)**: Percentage of recommended products that users click on
- **Conversion Rate (CVR)**: Percentage of clicked recommendations that lead to a purchase
- **Revenue Per Recommendation**: Average revenue generated per recommendation impression
- **Average Order Value lift**: How much higher is the order value when users interact with recommendations vs when they do not

## Accessing Model Metrics in Recommendations AI

Recommendations AI provides some metrics directly through the console and API.

```python
from google.cloud import retail_v2

def get_model_info(project_id, model_id):
    """Retrieve model status and basic metrics."""
    client = retail_v2.ModelServiceClient()

    model_name = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog/models/{model_id}"
    )

    model = client.get_model(name=model_name)

    print(f"Model: {model.display_name}")
    print(f"Type: {model.type_}")
    print(f"Training state: {model.training_state}")
    print(f"Serving state: {model.serving_state}")
    print(f"Optimization objective: {model.optimization_objective}")
    print(f"Data state: {model.data_state}")
    print(f"Last tune time: {model.last_tune_time}")

    # Check for any training warnings
    if model.model_features_config:
        print(f"Features config: {model.model_features_config}")

    return model

model = get_model_info("my-gcp-project", "homepage-rec-model")
```

## Building a Custom Evaluation Pipeline

To track business metrics, build your own evaluation system that connects recommendation impressions with actual user behavior.

```python
from google.cloud import bigquery
from datetime import datetime, timedelta

bq_client = bigquery.Client()

def track_recommendation_impression(visitor_id, serving_config,
                                      recommended_product_ids):
    """Log which products were recommended to a user."""
    rows = [{
        "visitor_id": visitor_id,
        "serving_config": serving_config,
        "product_id": pid,
        "position": i + 1,
        "impression_time": datetime.utcnow().isoformat(),
        "event_date": datetime.utcnow().strftime("%Y-%m-%d")
    } for i, pid in enumerate(recommended_product_ids)]

    table_ref = bq_client.dataset("analytics").table("rec_impressions")
    errors = bq_client.insert_rows_json(table_ref, rows)

    if errors:
        print(f"Error logging impressions: {errors}")

def track_recommendation_click(visitor_id, product_id, serving_config):
    """Log when a user clicks on a recommended product."""
    row = {
        "visitor_id": visitor_id,
        "product_id": product_id,
        "serving_config": serving_config,
        "click_time": datetime.utcnow().isoformat(),
        "event_date": datetime.utcnow().strftime("%Y-%m-%d")
    }

    table_ref = bq_client.dataset("analytics").table("rec_clicks")
    bq_client.insert_rows_json(table_ref, [row])
```

## Calculating CTR and CVR

With impression and click data in BigQuery, calculate key business metrics.

```sql
-- Calculate CTR (Click-Through Rate) by serving config
-- CTR tells you what percentage of recommended products get clicked
SELECT
  i.serving_config,
  i.event_date,
  COUNT(DISTINCT CONCAT(i.visitor_id, i.product_id)) as impressions,
  COUNT(DISTINCT CONCAT(c.visitor_id, c.product_id)) as clicks,
  ROUND(
    SAFE_DIVIDE(
      COUNT(DISTINCT CONCAT(c.visitor_id, c.product_id)),
      COUNT(DISTINCT CONCAT(i.visitor_id, i.product_id))
    ) * 100, 2
  ) as ctr_percent
FROM analytics.rec_impressions i
LEFT JOIN analytics.rec_clicks c
  ON i.visitor_id = c.visitor_id
  AND i.product_id = c.product_id
  AND i.event_date = c.event_date
WHERE i.event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY i.serving_config, i.event_date
ORDER BY i.event_date DESC, i.serving_config;
```

```sql
-- Calculate CVR (Conversion Rate) from recommendations
-- CVR tells you what percentage of recommendation clicks lead to purchases
SELECT
  c.serving_config,
  COUNT(DISTINCT CONCAT(c.visitor_id, c.product_id)) as clicks,
  COUNT(DISTINCT CONCAT(p.visitor_id, p.product_id)) as purchases,
  ROUND(
    SAFE_DIVIDE(
      COUNT(DISTINCT CONCAT(p.visitor_id, p.product_id)),
      COUNT(DISTINCT CONCAT(c.visitor_id, c.product_id))
    ) * 100, 2
  ) as cvr_percent
FROM analytics.rec_clicks c
LEFT JOIN analytics.purchases p
  ON c.visitor_id = p.visitor_id
  AND c.product_id = p.product_id
  AND p.purchase_time > c.click_time
  AND p.purchase_time < TIMESTAMP_ADD(c.click_time, INTERVAL 24 HOUR)
GROUP BY c.serving_config;
```

## Position-Based Analysis

Products shown in position 1 should perform differently from position 10. Track performance by position to understand model ranking quality.

```sql
-- CTR by position shows how well the model ranks relevant items
SELECT
  i.position,
  COUNT(*) as impressions,
  COUNT(c.visitor_id) as clicks,
  ROUND(SAFE_DIVIDE(COUNT(c.visitor_id), COUNT(*)) * 100, 2) as ctr_percent
FROM analytics.rec_impressions i
LEFT JOIN analytics.rec_clicks c
  ON i.visitor_id = c.visitor_id
  AND i.product_id = c.product_id
  AND i.event_date = c.event_date
WHERE i.event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY i.position
ORDER BY i.position;
```

A healthy recommendation system shows a clear decline in CTR as position increases - the best items should be at the top.

## Measuring Catalog Coverage

Check how much of your catalog is being recommended.

```sql
-- What percentage of products ever get recommended?
SELECT
  (SELECT COUNT(DISTINCT product_id) FROM analytics.rec_impressions
   WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
  as recommended_products,
  (SELECT COUNT(*) FROM retail.products WHERE availability = 'IN_STOCK')
  as total_products,
  ROUND(
    SAFE_DIVIDE(
      (SELECT COUNT(DISTINCT product_id) FROM analytics.rec_impressions
       WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)),
      (SELECT COUNT(*) FROM retail.products WHERE availability = 'IN_STOCK')
    ) * 100, 1
  ) as coverage_percent;
```

Low coverage (below 30%) suggests the model is stuck in a popularity bias, only recommending well-known products.

## A/B Testing Recommendations

The gold standard for evaluation is A/B testing. Compare recommendations against a control group.

```python
import hashlib

def get_ab_test_group(visitor_id, test_name, control_weight=0.5):
    """Deterministically assign a visitor to a test group."""
    # Hash the visitor ID + test name for consistent assignment
    hash_input = f"{visitor_id}:{test_name}"
    hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)

    # Map to a float between 0 and 1
    normalized = (hash_value % 10000) / 10000.0

    if normalized < control_weight:
        return "control"
    else:
        return "treatment"

def serve_with_ab_test(visitor_id, user_id=None):
    """Serve recommendations with A/B test tracking."""
    group = get_ab_test_group(visitor_id, "rec-model-v2")

    if group == "treatment":
        # Use the new model
        recs = get_recommendations(visitor_id, user_id, "new-model-recs")
    else:
        # Use the current model
        recs = get_recommendations(visitor_id, user_id, "current-model-recs")

    # Log the group for analysis
    log_ab_assignment(visitor_id, "rec-model-v2", group)

    return recs
```

## Setting Up Automated Alerts

Create alerts for when recommendation quality degrades.

```python
def check_recommendation_health():
    """Daily health check for recommendation system."""
    query = """
        SELECT
          serving_config,
          ROUND(AVG(ctr_percent), 2) as avg_ctr,
          ROUND(AVG(cvr_percent), 2) as avg_cvr
        FROM (
          -- CTR calculation subquery
          SELECT serving_config, event_date,
            SAFE_DIVIDE(clicks, impressions) * 100 as ctr_percent,
            SAFE_DIVIDE(purchases, clicks) * 100 as cvr_percent
          FROM analytics.daily_rec_metrics
          WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        )
        GROUP BY serving_config
    """

    results = bq_client.query(query).result()

    for row in results:
        if row.avg_ctr < 2.0:  # Alert if CTR drops below 2%
            send_alert(f"Low CTR alert: {row.serving_config} "
                      f"CTR is {row.avg_ctr}%")
        if row.avg_cvr < 0.5:  # Alert if CVR drops below 0.5%
            send_alert(f"Low CVR alert: {row.serving_config} "
                      f"CVR is {row.avg_cvr}%")
```

## Wrapping Up

Evaluating recommendation quality requires looking at both model metrics and business metrics. Recommendations AI provides training and data state information, but the real evaluation happens when you track how users interact with recommendations in production. Build an evaluation pipeline that logs impressions, clicks, and purchases, then query that data to calculate CTR, CVR, and coverage. Use position-based analysis to verify the model is ranking well, and run A/B tests before rolling out model changes. Continuous monitoring with automated alerts ensures you catch quality degradation before it impacts revenue.
