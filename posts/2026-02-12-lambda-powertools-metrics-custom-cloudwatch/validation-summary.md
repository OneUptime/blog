# Validation Summary: How to Use Lambda Powertools Metrics for Custom CloudWatch Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- AWS Lambda Powertools for Python Metrics
- Amazon CloudWatch Metrics
- Amazon CloudWatch Logs Embedded Metric Format (EMF)
- Amazon CloudWatch dashboards and alarms
- Terraform AWS provider
- Python and boto3

## Sources Consulted
- AWS Lambda Powertools for Python Metrics documentation: https://docs.aws.amazon.com/powertools/python/latest/core/metrics/
- AWS Lambda Powertools for Python metrics API documentation: https://docs.aws.amazon.com/powertools/python/latest/api/metrics/
- Amazon CloudWatch Embedded Metric Format specification: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html
- Amazon CloudWatch metrics concepts and dimensions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html
- Amazon CloudWatch dashboard body structure and syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- Amazon CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The post claimed EMF metrics had no additional cost beyond log ingestion. Updated this to clarify that EMF avoids direct `PutMetricData` calls and request charges, but extracted custom metrics and CloudWatch Logs ingestion still count toward CloudWatch pricing.
- The post said metrics would be lost without `@metrics.log_metrics`. Updated this to clarify that manual `metrics.flush_metrics()` is also valid.
- Order value and payment amount examples used `MetricUnit.Count` for currency-like numeric values. Changed these to `MetricUnit.NoUnit`, which is a supported CloudWatch unit and a better fit for dimensionless business values.
- The dimensions example added `PaymentMethod` after already adding `OrderProcessed`, which could imply it only applied to later metrics. Moved the dimension before the metric calls and clarified that dimensions apply to the metric set.
- The high-resolution metric example omitted the `Environment` dimension while later alarms and dashboards queried by that dimension. Added it to keep the examples consistent.
- The Terraform percentile alarm used `statistic = "p99"`. Changed it to `extended_statistic = "p99"`, which is the Terraform field for percentile statistics.
- Terraform alarm and dashboard examples omitted the Powertools `service` dimension that is emitted by `Metrics(service="order-processor")`. Added the dimension to the relevant CloudWatch metric queries.
- The dashboard used `"..."` shorthand in metric arrays, but CloudWatch dashboard metric syntax documents `"."` for reusing values from the previous metric. Replaced these entries with valid `"."` shorthand.
- The dashboard widgets omitted `region`, which the CloudWatch dashboard body documentation marks as required for metric widgets. Added `region = "us-east-1"` to each metric widget.
- The cold-start dashboard queried only by `service`, but Powertools emits cold-start metrics with `function_name` and `service` dimensions. Added `function_name` to match the emitted metric identity.
- The `PaymentByMethod` dashboard widget omitted the `Currency` dimension emitted by the `single_metric` example. Added the `Currency` dimension to the widget metrics.

## Review Notes
The Python snippets were checked for syntax with Python AST parsing. The workspace does not have `aws_lambda_powertools` installed, so runtime import validation was performed against official Powertools documentation instead of local execution.
