# How to Configure Redshift Concurrency Scaling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Redshift, Performance, Data Warehouse

Description: Learn how to configure Redshift concurrency scaling to automatically handle query spikes by adding transient clusters on demand.

---

Redshift handles concurrent queries well up to a point. But when your BI team runs dashboards, your data scientists submit ad-hoc queries, and your ETL pipeline kicks off - all at the same time - queries start queueing. Concurrency scaling fixes this by automatically spinning up additional compute clusters during peak demand. The extra clusters handle overflow queries, and you don't have to over-provision your main cluster for peak loads.

## How Concurrency Scaling Works

When query queues fill up beyond what your main cluster can handle, Redshift automatically adds transient "concurrency scaling clusters." Queries on these clusters see the same current data as queries on the main cluster. They handle the extra queries, then shut down when demand drops.

The key details:
- Scaling clusters start in seconds (they use pre-warmed capacity)
- Queries see the same current data as the main cluster
- Read queries and supported write operations can run on scaling clusters
- Supported write operations include COPY, INSERT, DELETE, UPDATE, CREATE TABLE AS (CTAS), VACUUM, and materialized view refreshes; most other DDL and some table configurations are not supported
- You get up to one hour of free concurrency scaling per day per cluster (for every 24 hours of main cluster usage)

## Enabling Concurrency Scaling

Concurrency scaling is enabled per WLM (Workload Management) queue. You choose which queues can burst to scaling clusters.

Enable it through the parameter group:

```bash
# Modify the WLM configuration to enable concurrency scaling

aws redshift modify-cluster-parameter-group \
  --parameter-group-name my-cluster-params \
  --parameters '[
    {
      "ParameterName": "wlm_json_configuration",
      "ParameterValue": "[{\"name\":\"default\",\"memory_percent_to_use\":100,\"concurrency_scaling\":\"auto\",\"query_concurrency\":5}]"
    }
  ]'

# If AWS reports that the change is pending a reboot, reboot the cluster
# aws redshift reboot-cluster \
#   --cluster-identifier my-cluster
```

The critical setting is `"concurrency_scaling": "auto"`. This tells Redshift to route overflow queries from this queue to scaling clusters when needed.

## WLM Configuration with Multiple Queues

In practice, you'll want multiple queues with different concurrency scaling settings. Some workloads should burst, others shouldn't.

Here's a WLM configuration with three queues:

```json
[
  {
    "name": "dashboard_queries",
    "query_concurrency": 10,
    "memory_percent_to_use": 40,
    "concurrency_scaling": "auto",
    "user_group": ["dashboard_users", "bi_team"],
    "query_group": ["dashboard"]
  },
  {
    "name": "etl_pipeline",
    "query_concurrency": 3,
    "memory_percent_to_use": 40,
    "concurrency_scaling": "off",
    "user_group": ["etl_user"],
    "query_group": ["etl"]
  },
  {
    "name": "default",
    "query_concurrency": 5,
    "memory_percent_to_use": 20,
    "concurrency_scaling": "auto"
  }
]
```

In this setup:
- Dashboard queries can burst to scaling clusters (they're read-heavy and user-facing)
- ETL queries stay on the main cluster here (some write operations can run on scaling clusters, but ETL often includes unsupported DDL, temporary tables, or table configurations)
- Default queue catches everything else and can also burst

Apply this configuration:

```bash
# Apply the multi-queue WLM config
aws redshift modify-cluster-parameter-group \
  --parameter-group-name my-cluster-params \
  --parameters file://modify-wlm.json
```

Where `modify-wlm.json` contains the escaped WLM configuration:

```json
[
  {
    "ParameterName": "wlm_json_configuration",
    "ParameterValue": "[{\"name\":\"dashboard_queries\",\"query_concurrency\":10,\"memory_percent_to_use\":40,\"concurrency_scaling\":\"auto\",\"user_group\":[\"dashboard_users\",\"bi_team\"],\"query_group\":[\"dashboard\"]},{\"name\":\"etl_pipeline\",\"query_concurrency\":3,\"memory_percent_to_use\":40,\"concurrency_scaling\":\"off\",\"user_group\":[\"etl_user\"],\"query_group\":[\"etl\"]},{\"name\":\"default\",\"query_concurrency\":5,\"memory_percent_to_use\":20,\"concurrency_scaling\":\"auto\"}]"
  }
]
```

## Setting Concurrency Scaling Limits

You can limit how many scaling clusters Redshift adds to control costs:

```bash
# Set maximum concurrency scaling clusters
aws redshift modify-cluster-parameter-group \
  --parameter-group-name my-cluster-params \
  --parameters ParameterName=max_concurrency_scaling_clusters,ParameterValue=3
```

The default is 1, meaning Redshift adds up to 1 scaling cluster. You can increase this to handle larger spikes. Additional scaling clusters can increase throughput for eligible queued queries, up to your configured limit and service quota.

## Routing Queries to Scaling Clusters

Queries are routed to scaling clusters based on the WLM queue they land in. You can influence routing by setting query groups.

Control which queries go to scaling clusters:

```sql
-- Force a query to the dashboard queue (which has concurrency scaling)
SET query_group TO 'dashboard';
SELECT * FROM analytics.daily_sales WHERE order_date = CURRENT_DATE;
RESET query_group;

-- Route a query to the ETL queue, which has concurrency scaling disabled
-- in the WLM configuration above.
SET query_group TO 'etl';
INSERT INTO sales.orders SELECT * FROM staging.new_orders;
RESET query_group;
```

For applications, set the query group in your connection:

```python
import redshift_connector

conn = redshift_connector.connect(
    host="my-cluster.abc123.us-east-1.redshift.amazonaws.com",
    port=5439,
    database="analytics_db",
    user="dashboard_user",
    password="password",
)

cursor = conn.cursor()

# Set the query group for this session
cursor.execute("SET query_group TO 'dashboard'")

# This query will be routed to concurrency scaling if the main cluster is busy
cursor.execute("""
    SELECT category, SUM(total_revenue)
    FROM analytics.daily_sales
    WHERE order_date >= DATEADD(day, -7, CURRENT_DATE)
    GROUP BY category
""")

results = cursor.fetchall()
```

## Monitoring Concurrency Scaling

Track when scaling clusters are active and how many queries they handle.

Check concurrency scaling activity:

```sql
-- See which queries ran on scaling clusters
SELECT
    query,
    TRIM(querytxt) AS sql,
    starttime,
    endtime,
    DATEDIFF(millisecond, starttime, endtime) AS duration_ms,
    concurrency_scaling_status
FROM stl_query
WHERE concurrency_scaling_status = 1  -- 1 = ran on scaling cluster
  AND starttime > DATEADD(hour, -24, GETDATE())
ORDER BY starttime DESC
LIMIT 20;

-- Count queries by scaling status
SELECT
    CASE concurrency_scaling_status
        WHEN 0 THEN 'Main cluster'
        WHEN 1 THEN 'Scaling cluster'
        ELSE 'Main cluster'
    END AS location,
    COUNT(*) AS query_count,
    AVG(DATEDIFF(millisecond, starttime, endtime)) AS avg_duration_ms
FROM stl_query
WHERE starttime > DATEADD(hour, -24, GETDATE())
GROUP BY 1;
```

Use CloudWatch metrics for a high-level view:

```bash
# Check concurrency scaling metrics
aws cloudwatch get-metric-statistics \
  --namespace "AWS/Redshift" \
  --metric-name "ConcurrencyScalingActiveClusters" \
  --dimensions Name=ClusterIdentifier,Value=my-cluster \
  --start-time "2026-02-11T00:00:00Z" \
  --end-time "2026-02-12T00:00:00Z" \
  --period 300 \
  --statistics Maximum
```

## Cost Management

Concurrency scaling charges are based on per-second billing for each scaling cluster. You get up to one hour of free credits per day for every 24 hours your main cluster runs.

Track your usage:

```sql
-- Check concurrency scaling usage
SELECT
    DATE_TRUNC('day', start_time) AS day,
    SUM(usage_in_seconds) / 3600.0 AS scaling_hours
FROM svcs_concurrency_scaling_usage
WHERE start_time > DATEADD(day, -30, GETDATE())
GROUP BY DATE_TRUNC('day', start_time)
ORDER BY day DESC;
```

Set up a CloudWatch alarm to alert when scaling usage exceeds your budget:

```bash
# Alert when scaling clusters are active for more than 2 hours
aws cloudwatch put-metric-alarm \
  --alarm-name "redshift-concurrency-scaling-high" \
  --namespace "AWS/Redshift" \
  --metric-name "ConcurrencyScalingSeconds" \
  --dimensions Name=ClusterIdentifier,Value=my-cluster \
  --statistic Sum \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 7200 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

## CloudFormation Configuration

Set up WLM and concurrency scaling in CloudFormation:

```yaml
Resources:
  ClusterParameterGroup:
    Type: AWS::Redshift::ClusterParameterGroup
    Properties:
      Description: Parameter group with concurrency scaling
      ParameterGroupFamily: redshift-1.0
      Parameters:
        - ParameterName: wlm_json_configuration
          ParameterValue: |
            [
              {
                "name": "analytics",
                "query_concurrency": 10,
                "memory_percent_to_use": 50,
                "concurrency_scaling": "auto",
                "user_group": ["analysts", "bi_users"],
                "max_execution_time": 300000
              },
              {
                "name": "etl",
                "query_concurrency": 3,
                "memory_percent_to_use": 30,
                "concurrency_scaling": "off",
                "user_group": ["etl_service"]
              },
              {
                "name": "default",
                "query_concurrency": 5,
                "memory_percent_to_use": 20,
                "concurrency_scaling": "auto"
              }
            ]

  RedshiftCluster:
    Type: AWS::Redshift::Cluster
    Properties:
      ClusterIdentifier: analytics-cluster
      ClusterType: multi-node
      NumberOfNodes: 4
      NodeType: ra3.xlplus
      ClusterParameterGroupName: !Ref ClusterParameterGroup
      # ... other properties
```

## Concurrency Scaling with Redshift Serverless

If you're on Redshift Serverless, concurrency scaling works differently. Serverless automatically scales RPU capacity based on demand. There's no separate "concurrency scaling" feature because the serverless model handles it natively.

```bash
# For serverless, just set the max capacity
aws redshift-serverless update-workgroup \
  --workgroup-name analytics-workgroup \
  --max-capacity 256
```

Serverless scales capacity up and down based on demand. You don't configure provisioned-cluster concurrency scaling queues for it.

## Best Practices

1. **Enable concurrency scaling on queues with eligible workloads**. Read-heavy queues are a natural fit, and supported write operations can also use concurrency scaling when they meet Redshift's requirements.
2. **Set a max clusters limit** to control costs. Start with 1-2 and increase if needed.
3. **Monitor free credits**. Take advantage of the free hour per day before paying for extra.
4. **Separate ETL and analytics queues**. ETL often includes operations or table patterns that aren't eligible for concurrency scaling, while analytics is usually read-heavy and burst-friendly.
5. **Use query groups** to route critical queries to the right queue.

For monitoring Redshift cluster performance and concurrency scaling metrics, check our post on [data warehouse monitoring](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view).

## Wrapping Up

Concurrency scaling lets your Redshift cluster handle traffic spikes without over-provisioning. Enable it on your read-heavy WLM queues, set reasonable limits, and let Redshift add capacity when needed. The free credits cover moderate bursting, and per-second billing keeps costs predictable. For workloads with unpredictable query patterns, it's one of the most cost-effective ways to maintain consistent performance.
