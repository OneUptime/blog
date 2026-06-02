# Validation Summary: How to Scrape Metrics from EKS Pods with Amazon Managed Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Amazon Managed Service for Prometheus
- Prometheus
- Kubernetes service discovery and annotations
- IAM Roles for Service Accounts
- eksctl
- Helm
- Flask
- Express
- Go prometheus/client_golang

## Sources Consulted
- Amazon Managed Service for Prometheus customer managed collectors: https://docs.aws.amazon.com/prometheus/latest/userguide/self-managed-collectors.html
- Amazon Managed Service for Prometheus RemoteWrite API: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-APIReference-RemoteWrite.html
- Amazon Managed Service for Prometheus workspace URL documentation: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-find-workspace-details.html
- AWS Service Authorization Reference for Amazon Managed Service for Prometheus: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonmanagedserviceforprometheus.html
- AWS managed policy AmazonPrometheusRemoteWriteAccess: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonPrometheusRemoteWriteAccess.html
- eksctl IAM roles for service accounts documentation: https://eksctl.io/usage/iamserviceaccounts/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote write tuning documentation: https://prometheus.io/docs/practices/remote_write/
- Prometheus community Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus/values.yaml
- Prometheus Go application instrumentation guide: https://prometheus.io/docs/guides/go-application/
- Go promhttp package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp

## Issues Found
- The Helm values snippet used `queueConfig`, `maxSamplesPerSend`, and `maxShards` under `server.remoteWrite`. The Prometheus community chart passes `server.remoteWrite` into Prometheus configuration, where the correct keys are `queue_config`, `max_samples_per_send`, and `max_shards`. Updated the values snippet to use Prometheus configuration field names.
- The Helm install command assumed the Prometheus community chart repository had already been added. Added `helm repo add` and `helm repo update` commands before installation.
- The Prometheus query `curl` command put a raw PromQL selector in the URL. Updated it to use `curl -G --data-urlencode` so braces, quotes, and label matchers are sent correctly.
- The remote-write optimization example used a shortened workspace ID that did not match the rest of the post. Updated it to the same placeholder workspace ID used elsewhere.
- The Flask snippet referenced `Flask` without importing it. Added the `from flask import Flask` import.
- The Express snippet referenced `app` without defining it. Added the `express` import and `app` initialization.
- The Go snippet referenced `http` and `promhttp` without imports or an executable context. Replaced it with a minimal valid program that registers `/metrics` and starts an HTTP server.

## Review Notes
The Prometheus pod discovery, relabeling labels, AMP SigV4 remote write configuration, `aps:RemoteWrite` permission, IRSA setup approach, and AMP remote write URL shape are consistent with the consulted documentation. For production use, readers should still tune remote-write queue settings and metric drops for their ingestion volume and avoid dropping histogram buckets when they need histogram quantile queries.
