# Validation Summary: How to Use CloudWatch Application Signals for SLO Monitoring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon CloudWatch Application Signals
- CloudWatch service level objectives (SLOs), service level indicators (SLIs), error budgets, and burn rates
- Amazon CloudWatch Agent
- AWS Distro for OpenTelemetry / OpenTelemetry auto-instrumentation
- Amazon EKS and the Amazon CloudWatch Observability add-on
- Amazon ECS task definition environment variables
- AWS CLI
- CloudWatch alarms and dashboards

## Sources Consulted
- AWS CloudWatch User Guide: Application Signals - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html
- AWS CloudWatch User Guide: Enable CloudWatch Application Signals - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Application_Signals.html
- AWS CloudWatch User Guide: Enable your applications on Amazon EKS clusters - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Signals-Enable-EKS.html
- AWS CloudWatch User Guide: Enable your applications on Amazon ECS - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Signals-Enable-ECS.html
- AWS CloudWatch User Guide: Deploy using the sidecar strategy for ECS - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Signals-ECS-Sidecar.html
- AWS CloudWatch User Guide: Metrics collected by Application Signals - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AppSignals-MetricsCollected.html
- AWS CloudWatch User Guide: Service level objectives (SLOs) - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-ServiceLevelObjectives.html
- AWS CLI v2 Command Reference: application-signals list-services - https://docs.aws.amazon.com/cli/latest/reference/application-signals/list-services.html
- AWS CLI v2 Command Reference: application-signals create-service-level-objective - https://docs.aws.amazon.com/cli/latest/reference/application-signals/create-service-level-objective.html
- AWS CloudFormation Template Reference: ApplicationSignals ServiceLevelObjective BurnRateConfiguration - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-applicationsignals-servicelevelobjective-burnrateconfiguration.html

## Issues Found
- The CloudWatch agent configuration used an undocumented `enabled` field inside `application_signals`. Replaced those objects with the documented empty `application_signals` sections under `logs.metrics_collected` and `traces.traces_collected`.
- The EKS add-on command implied that Application Signals must be enabled through a custom `configuration-values` payload. AWS documents that the Amazon CloudWatch Observability add-on enables the agent to receive Application Signals metrics and traces by default, so the command was simplified to installing the add-on.
- The ECS environment variable snippet was not valid JSON and used the generic OTLP endpoint on port 4317. Replaced it with a task-definition environment array using the documented Application Signals variables and HTTP endpoints on port 4316.
- The service discovery CLI example used `aws cloudwatch list-services`, but Application Signals has its own AWS CLI service namespace. Changed it to `aws application-signals list-services` and added the required `--start-time` and `--end-time` parameters.
- The SLO creation examples used `aws cloudwatch create-service-level-objective`, which is not the documented CLI namespace. Changed both examples to `aws application-signals create-service-level-objective`.
- The burn-rate alarm example monitored `SloAttainment` with a less-than threshold, which does not match burn-rate alerting. Changed it to monitor the `BurnRate` metric with the `SloName` and `BurnRateWindowMinutes` dimensions, a `Maximum` statistic, and a `GreaterThanThreshold` comparison.
- The dashboard example used the non-documented `SloAttainment` metric name and contained a JavaScript-style comment in a JSON block. Replaced the metric name with `AttainmentRate` and removed the comment so the snippet is valid JSON.

## Review Notes
Application Signals support and setup details vary by platform and instrumentation language. The post remains a high-level tutorial; production ECS and EKS rollouts should still follow the full AWS setup guides for IAM permissions, add-on versions, sidecar or daemon deployment strategy, and language-specific auto-instrumentation requirements.
