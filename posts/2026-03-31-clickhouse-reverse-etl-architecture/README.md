# How to Use ClickHouse in a Reverse ETL Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Reverse ETL, Data Activation, Analytics, CRM

Description: Use ClickHouse as the source in a reverse ETL pipeline to push analytical insights back into CRMs, ad platforms, and operational tools.

---

## What Is Reverse ETL

Traditional ETL moves data from operational systems into a data warehouse. Reverse ETL flips this: it reads computed insights from your warehouse and pushes them into operational tools like Salesforce, HubSpot, or Google Ads.

ClickHouse is well-suited as the reverse ETL source because it can quickly compute complex user segments and behavioral metrics.

## Common Reverse ETL Use Cases

- Sync high-value customer segments to your CRM for sales outreach
- Push user churn scores to marketing automation
- Update ad platform audiences with in-product behavior signals
- Enrich support tickets with user lifetime value data

## Computing Segments in ClickHouse

Build the segment query in ClickHouse as the reverse ETL source:

```sql
SELECT
    user_id,
    email,
    sum(order_total_cents) / 100.0 AS lifetime_value_usd,
    count(DISTINCT order_id) AS order_count,
    max(order_date) AS last_order_date,
    if(max(order_date) < today() - 90, 'at_risk', 'active') AS churn_segment
FROM user_order_summary
GROUP BY user_id, email
HAVING order_count >= 2 AND lifetime_value_usd > 500;
```

## Exporting to CSV for Upload

For simple pipelines, export the segment to CSV and upload via API:

```bash
clickhouse-client --query "
  SELECT user_id, email, lifetime_value_usd, churn_segment
  FROM user_segments
  WHERE updated_date = today()
  FORMAT CSVWithNames
" > /tmp/segment_export.csv

# Upload to HubSpot via their import API
curl -X POST "https://api.hubapi.com/crm/v3/imports" \
  -H "Authorization: Bearer ${HUBSPOT_TOKEN}" \
  -F "files=@/tmp/segment_export.csv" \
  -F 'importRequest={"name":"ClickHouse Segment","files":[{"fileName":"segment_export.csv","fileFormat":"CSV"}]}'
```

## Using Hightouch or Census

Dedicated reverse ETL tools like Hightouch and Census connect directly to ClickHouse as a source via SQL and handle the sync to destinations:

```text
Source: ClickHouse
  SQL Model: SELECT user_id, email, churn_segment FROM user_segments WHERE updated_date = today()

Destination: Salesforce
  Object: Contact
  Match on: Email
  Fields: churn_segment -> Custom_Field__c
  Schedule: Every 4 hours
```

## Scheduling the Export

For custom pipelines, schedule the export with cron:

```bash
# /etc/cron.d/clickhouse-reverse-etl
0 */4 * * * etl_user /opt/scripts/sync_segments.sh >> /var/log/reverse_etl.log 2>&1
```

## Monitoring Sync Health

Track when the last successful sync ran and how many records were exported:

```sql
CREATE TABLE reverse_etl_log (
    sync_time       DateTime DEFAULT now(),
    destination     String,
    records_exported UInt32,
    status          LowCardinality(String),
    error_message   String
) ENGINE = MergeTree()
ORDER BY sync_time;
```

Alert via OneUptime when a sync fails or exports zero records unexpectedly.

## Summary

ClickHouse powers reverse ETL pipelines by computing precise user segments and behavioral metrics that are then pushed into CRMs, ad platforms, and marketing tools to activate data for operational use cases.
