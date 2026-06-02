# Validation Summary: How to Monitor RDS with Performance Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- Amazon RDS Performance Insights
- CloudWatch Database Insights
- Amazon CloudWatch metrics and alarms
- AWS CLI
- Python
- boto3
- PostgreSQL wait events
- MySQL wait events

## Sources Consulted
- Amazon RDS User Guide: Turning Performance Insights on and off for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Enabling.html
- Amazon RDS User Guide: Pricing and data retention for Performance Insights: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.cost.html
- Amazon RDS User Guide: Amazon CloudWatch metrics for Amazon RDS Performance Insights: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Cloudwatch.html
- boto3 documentation: PI.Client.get_resource_metrics: https://docs.aws.amazon.com/boto3/latest/reference/services/pi/client/get_resource_metrics.html
- AWS CLI Command Reference: pi get-resource-metrics: https://docs.aws.amazon.com/cli/latest/reference/pi/get-resource-metrics.html
- Amazon RDS User Guide: RDS for PostgreSQL wait events: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Tuning.concepts.summary.html
- Amazon Aurora User Guide: MySQL wait event io/table/sql/handler: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/ams-waits.waitio.html
- Amazon Aurora User Guide: MySQL wait event synch/mutex/innodb/buf_pool_mutex: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/ams-waits.bufpoolmutex.html

## Issues Found
- The AWS CLI examples enabled Performance Insights without specifying `--database-insights-mode`. Current AWS documentation instructs CLI users to set Database Insights mode to either `standard` or `advanced` when enabling Performance Insights. I added `--database-insights-mode standard` to both CLI examples.
- The retention-period explanation only mentioned 7 and 731 days. AWS documentation allows 7, monthly values calculated as `month * 31` for months 1 through 23, or 731. I updated the explanation.
- The post did not mention AWS's announced June 30, 2026 end-of-life for the Performance Insights console experience, flexible retention periods, and associated pricing. I added a concise caveat and the recommended migration path for paid retention users.
- The boto3 `get_resource_metrics` examples incorrectly iterated over `response['MetricList'][0]['KeyList']`. The API returns one `MetricList` item per dimension, with dimensions under `metric['Key']['Dimensions']` and time series values under `metric['DataPoints']`. I corrected both examples.
- The wait-event API example read `db.wait_event` directly from dimensions. The documented returned dimension is `db.wait_event.name`, so I updated the example to use that key.
- The Python examples used `datetime.utcnow()`, which is deprecated in current Python. I changed it to `datetime.now(timezone.utc)`.

## Review Notes
The CloudWatch `DBLoad` alarm example, AAS explanation, supported Performance Insights dimensions, and PostgreSQL wait-event descriptions are consistent with AWS documentation. The MySQL wait-event examples are plausible Performance Schema/AWS wait-event names, though some detailed AWS wait-event pages are published under the Aurora MySQL documentation rather than a separate RDS MySQL page.
