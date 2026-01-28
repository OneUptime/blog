# How to Monitor Tekton Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Monitoring, Observability, Prometheus, DevOps

Description: Learn how to monitor Tekton pipelines using metrics, events, and dashboards to track pipeline health and performance.

---

Tekton exposes metrics and events that help you track pipeline success rates, durations, and failures. This guide shows how to monitor Tekton in production.

## Metrics to Track

- PipelineRun success and failure counts
- TaskRun duration
- Queue time and concurrency
- Error rate by task

## Enable Metrics Scraping

Tekton exposes Prometheus metrics by default. Configure Prometheus to scrape the Tekton controller and webhook services.

## Use Grafana Dashboards

Create dashboards for:

- Pipeline throughput
- Failure trends
- Long-running tasks

## Alerting

Alert on:

- Failed PipelineRuns
- Task timeouts
- Rising queue depth

## Logs and Events

Use Kubernetes events to spot scheduling issues:

```bash
kubectl get events -n tekton-pipelines
```

## Conclusion

Monitoring Tekton pipelines is mostly about visibility into TaskRuns and PipelineRuns. With Prometheus and Grafana, you can catch failures early and keep CI stable.
