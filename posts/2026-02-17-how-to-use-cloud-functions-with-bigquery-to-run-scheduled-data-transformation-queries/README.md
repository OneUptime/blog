# How to Use Cloud Functions with BigQuery to Run Scheduled Data Transformation Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, BigQuery, Data Transformation, Scheduled Jobs

Description: Learn how to use Google Cloud Functions with Cloud Scheduler to run BigQuery data transformation queries on a schedule for building data pipelines and summary tables.

---

BigQuery has its own scheduled queries feature, but sometimes you need more flexibility - conditional logic, parameterized queries based on runtime values, multi-step transformations, error handling with notifications, or the ability to combine BigQuery with other GCP services. Cloud Functions paired with Cloud Scheduler give you that flexibility while keeping the serverless simplicity.

Here is how to set up a Cloud Function that runs BigQuery transformation queries on a schedule, handles errors properly, and keeps your data pipeline reliable.

## When to Use Cloud Functions vs BigQuery Scheduled Queries

Use BigQuery's built-in scheduled queries when:
- You have a single SQL query to run on a fixed schedule
- You do not need conditional logic or error handling beyond what BigQuery provides

Use Cloud Functions + Scheduler when:
- You need to run multiple queries in sequence
- Query parameters depend on runtime conditions
- You need custom error handling (Slack alerts, PagerDuty, etc.)
- You need to combine BigQuery with other services (Firestore, Cloud Storage, APIs)
- You want to check preconditions before running the query

## The Transformation Function

Let me build a practical example: a daily aggregation pipeline that summarizes event data into daily metrics tables.

```javascript
// index.js - BigQuery transformation pipeline
const functions = require('@google-cloud/functions-framework');
const { BigQuery } = require('@google-cloud/bigquery');

const bigquery = new BigQuery();
const PROJECT_ID = process.env.GCP_PROJECT;
const DATASET = process.env.BQ_DATASET || 'analytics';

functions.http('runTransformations', async (req, res) => {
  const startTime = Date.now();

  // Determine which date to process
  // Default to yesterday, allow override via query parameter
  const targetDate = req.query.date || getYesterdayDate();

  console.log(`Starting transformation pipeline for date: ${targetDate}`);

  try {
    // Step 1: Check that source data exists for the target date
    const hasData = await checkSourceData(targetDate);
    if (!hasData) {
      console.warn(`No source data found for ${targetDate}, skipping`);
      res.json({
        status: 'skipped',
        reason: 'No source data',
        date: targetDate
      });
      return;
    }

    // Step 2: Run the daily user metrics aggregation
    const userMetrics = await runUserMetricsAggregation(targetDate);
    console.log(`User metrics: ${userMetrics.rowsAffected} rows`);

    // Step 3: Run the daily revenue summary
    const revenueSummary = await runRevenueSummary(targetDate);
    console.log(`Revenue summary: ${revenueSummary.rowsAffected} rows`);

    // Step 4: Run the funnel conversion rates
    const funnelData = await runFunnelAnalysis(targetDate);
    console.log(`Funnel analysis: ${funnelData.rowsAffected} rows`);

    // Step 5: Update the data freshness metadata table
    await updateDataFreshness(targetDate);

    const duration = Date.now() - startTime;
    console.log(`Pipeline completed in ${duration}ms`);

    res.json({
      status: 'success',
      date: targetDate,
      durationMs: duration,
      results: {
        userMetrics: userMetrics.rowsAffected,
        revenueSummary: revenueSummary.rowsAffected,
        funnelData: funnelData.rowsAffected
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Pipeline failed after ${duration}ms:`, error);

    res.status(500).json({
      status: 'error',
      date: targetDate,
      durationMs: duration,
      error: error.message
    });
  }
});

function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
}

async function checkSourceData(date) {
  // Verify that the source table has data for the target date
  const query = `
    SELECT COUNT(*) as row_count
    FROM \`${PROJECT_ID}.${DATASET}.raw_events\`
    WHERE DATE(event_timestamp) = @target_date
  `;

  const [rows] = await bigquery.query({
    query,
    params: { target_date: date },
    types: { target_date: 'DATE' }
  });

  return rows[0].row_count > 0;
}

async function runUserMetricsAggregation(date) {
  // Aggregate user activity metrics for the day
  const query = `
    CREATE OR REPLACE TABLE \`${PROJECT_ID}.${DATASET}.daily_user_metrics_${date.replace(/-/g, '')}\`
    AS
    SELECT
      user_id,
      DATE(@target_date) as metric_date,
      COUNT(*) as total_events,
      COUNT(DISTINCT session_id) as unique_sessions,
      COUNTIF(event_type = 'page_view') as page_views,
      COUNTIF(event_type = 'purchase') as purchases,
      SUM(CASE WHEN event_type = 'purchase' THEN revenue ELSE 0 END) as total_revenue,
      MIN(event_timestamp) as first_event_at,
      MAX(event_timestamp) as last_event_at,
      TIMESTAMP_DIFF(MAX(event_timestamp), MIN(event_timestamp), SECOND) as session_duration_seconds
    FROM \`${PROJECT_ID}.${DATASET}.raw_events\`
    WHERE DATE(event_timestamp) = @target_date
    GROUP BY user_id
  `;

  const [job] = await bigquery.createQueryJob({
    query,
    params: { target_date: date },
    types: { target_date: 'DATE' }
  });

  const [metadata] = await job.getMetadata();
  await job.getQueryResults();

  return {
    rowsAffected: parseInt(
      metadata.statistics.query.numDmlAffectedRows || '0'
    )
  };
}

async function runRevenueSummary(date) {
  // Create daily revenue summary by product category
  const query = `
    MERGE INTO \`${PROJECT_ID}.${DATASET}.daily_revenue_summary\` T
    USING (
      SELECT
        DATE(@target_date) as summary_date,
        product_category,
        COUNT(DISTINCT user_id) as unique_buyers,
        COUNT(*) as transaction_count,
        SUM(revenue) as total_revenue,
        AVG(revenue) as avg_revenue,
        CURRENT_TIMESTAMP() as updated_at
      FROM \`${PROJECT_ID}.${DATASET}.raw_events\`
      WHERE DATE(event_timestamp) = @target_date
        AND event_type = 'purchase'
      GROUP BY product_category
    ) S
    ON T.summary_date = S.summary_date AND T.product_category = S.product_category
    WHEN MATCHED THEN
      UPDATE SET
        unique_buyers = S.unique_buyers,
        transaction_count = S.transaction_count,
        total_revenue = S.total_revenue,
        avg_revenue = S.avg_revenue,
        updated_at = S.updated_at
    WHEN NOT MATCHED THEN
      INSERT (summary_date, product_category, unique_buyers, transaction_count, total_revenue, avg_revenue, updated_at)
      VALUES (S.summary_date, S.product_category, S.unique_buyers, S.transaction_count, S.total_revenue, S.avg_revenue, S.updated_at)
  `;

  const [job] = await bigquery.createQueryJob({
    query,
    params: { target_date: date },
    types: { target_date: 'DATE' }
  });

  const [metadata] = await job.getMetadata();
  await job.getQueryResults();

  return {
    rowsAffected: parseInt(
      metadata.statistics.query.numDmlAffectedRows || '0'
    )
  };
}

async function runFunnelAnalysis(date) {
  // Calculate conversion funnel metrics
  const query = `
    INSERT INTO \`${PROJECT_ID}.${DATASET}.daily_funnel_metrics\`
    (funnel_date, step_name, unique_users, conversion_rate)
    WITH funnel AS (
      SELECT
        user_id,
        MAX(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as visited,
        MAX(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) as added_to_cart,
        MAX(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) as started_checkout,
        MAX(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) as purchased
      FROM \`${PROJECT_ID}.${DATASET}.raw_events\`
      WHERE DATE(event_timestamp) = @target_date
      GROUP BY user_id
    ),
    totals AS (
      SELECT
        COUNTIF(visited = 1) as step1,
        COUNTIF(added_to_cart = 1) as step2,
        COUNTIF(started_checkout = 1) as step3,
        COUNTIF(purchased = 1) as step4
      FROM funnel
    )
    SELECT @target_date, 'page_view', step1, 1.0 FROM totals
    UNION ALL
    SELECT @target_date, 'add_to_cart', step2, SAFE_DIVIDE(step2, step1) FROM totals
    UNION ALL
    SELECT @target_date, 'checkout_started', step3, SAFE_DIVIDE(step3, step1) FROM totals
    UNION ALL
    SELECT @target_date, 'purchase', step4, SAFE_DIVIDE(step4, step1) FROM totals
  `;

  const [job] = await bigquery.createQueryJob({
    query,
    params: { target_date: date },
    types: { target_date: 'DATE' }
  });

  const [metadata] = await job.getMetadata();
  await job.getQueryResults();

  return {
    rowsAffected: parseInt(
      metadata.statistics.query.numDmlAffectedRows || '0'
    )
  };
}

async function updateDataFreshness(date) {
  // Track when each date's data was last processed
  const query = `
    MERGE INTO \`${PROJECT_ID}.${DATASET}.data_freshness\` T
    USING (SELECT @target_date as processed_date, CURRENT_TIMESTAMP() as processed_at) S
    ON T.processed_date = S.processed_date
    WHEN MATCHED THEN UPDATE SET processed_at = S.processed_at
    WHEN NOT MATCHED THEN INSERT (processed_date, processed_at) VALUES (S.processed_date, S.processed_at)
  `;

  await bigquery.query({
    query,
    params: { target_date: date },
    types: { target_date: 'DATE' }
  });
}
```

## Deploying and Scheduling

```bash
# Deploy the transformation function
gcloud functions deploy run-transformations \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=runTransformations \
  --trigger-http \
  --memory=512Mi \
  --timeout=540s \
  --set-env-vars="BQ_DATASET=analytics"

# Set up IAM for Cloud Scheduler
gcloud run services add-iam-policy-binding run-transformations \
  --region=us-central1 \
  --member="serviceAccount:scheduler-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Schedule it to run daily at 6 AM UTC
gcloud scheduler jobs create http daily-transformations \
  --schedule="0 6 * * *" \
  --uri="https://run-transformations-abc123-uc.a.run.app" \
  --http-method=GET \
  --oidc-service-account-email=scheduler-sa@my-project.iam.gserviceaccount.com \
  --time-zone="UTC" \
  --attempt-deadline=600s
```

## Backfilling Historical Data

One advantage of using a Cloud Function over BigQuery scheduled queries is the ability to easily backfill. Run the function with a specific date to reprocess any day:

```bash
# Backfill a specific date
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  "https://run-transformations-abc123-uc.a.run.app?date=2024-01-10"

# Backfill a range of dates with a simple loop
for date in 2024-01-{01..31}; do
  curl -s -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
    "https://run-transformations-abc123-uc.a.run.app?date=${date}"
  echo " - Processed ${date}"
  sleep 2
done
```

## Error Handling with Notifications

Add notification logic to alert when the pipeline fails:

```javascript
// Send a notification on pipeline failure
async function notifyFailure(date, error) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  await axios.post(webhookUrl, {
    text: `Data pipeline failed for ${date}`,
    attachments: [{
      color: '#FF0000',
      title: 'Pipeline Failure',
      fields: [
        { title: 'Date', value: date, short: true },
        { title: 'Error', value: error.message, short: false }
      ]
    }]
  });
}
```

## Monitoring

Use OneUptime to monitor your BigQuery transformation pipeline end to end. Track execution duration, rows processed, query costs, and failure rates. Set up alerts for when the pipeline takes longer than expected or fails to run at all. A data pipeline that silently stops running can go unnoticed for days, leading to stale dashboards and incorrect reports. Proactive monitoring catches these issues before anyone else notices.

Cloud Functions and BigQuery make a powerful combination for scheduled data transformations. You get the flexibility of code with the scale of serverless, and the ability to build complex multi-step pipelines that would be difficult with SQL alone.
