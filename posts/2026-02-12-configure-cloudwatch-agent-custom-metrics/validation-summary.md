# Validation Summary: How to Configure the CloudWatch Agent for Custom Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Agent
- Amazon CloudWatch custom metrics
- Amazon EC2
- StatsD and DogStatsD-style tags
- collectd
- procstat
- ethtool / ENA network performance metrics
- NVIDIA GPU metrics via nvidia-smi
- CloudWatch Logs file collection
- Python UDP sockets
- Node.js hot-shots StatsD client

## Sources Consulted
- AWS CloudWatch Agent configuration file reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- AWS CloudWatch Agent StatsD custom metrics documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-custom-metrics-statsd.html
- AWS CloudWatch Agent collectd custom metrics documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-custom-metrics-collectd.html
- AWS CloudWatch Agent procstat documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-procstat-process-metrics.html
- AWS CloudWatch Agent network performance / ethtool documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-network-performance.html
- AWS CloudWatch Agent NVIDIA GPU metrics documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-NVIDIA-GPU.html
- AWS CloudWatch Agent startup / fetch-config documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/start-CloudWatch-Agent-on-premise-SSM-onprem.html
- hot-shots npm package documentation: https://www.npmjs.com/package/hot-shots

## Issues Found
- The introduction said the CloudWatch Agent can run custom scripts to gather metrics. The reviewed AWS documentation for the features shown in this post covers StatsD, collectd, procstat, ethtool, and NVIDIA GPU collection, but not a generic custom-script runner in the CloudWatch Agent configuration. Changed this wording to "collecting from supported metric sources."
- The heading "Custom Script Metrics with ethtool and nvidia_smi" described ethtool and NVIDIA GPU collection as custom script metrics. AWS documents these as built-in/supported metric sources, so the heading was changed to "Specialized Metrics with ethtool and nvidia_smi."

## Review Notes
- All JSON snippets parse as valid JSON.
- The CloudWatch Agent StatsD configuration fields, StatsD metric types, collectd options, procstat match methods and measurements, ethtool options, NVIDIA GPU measurement names, aggregation dimensions, high-resolution interval behavior, log collection fields, and fetch-config command were checked against official AWS documentation and found accurate after the wording fixes above.
- The two OneUptime links referenced at the end of the post returned HTTP 200 during review.
