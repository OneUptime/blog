# Validation Summary: How to Configure Flagger Metrics Analysis with CloudWatch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Flux HelmRelease
- AWS CloudWatch
- Amazon EKS IRSA
- Kubernetes
- kubectl
- Helm

## Sources Consulted
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger CRD schema and CloudWatch provider implementation: https://github.com/fluxcd/flagger
- Flagger Helm chart values: https://artifacthub.io/packages/helm/flagger/flagger
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- AWS CloudWatch GetMetricData API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricData.html
- AWS CloudWatch MetricDataQuery API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricDataQuery.html
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
1. **CloudWatch credentials were incorrectly attached to MetricTemplate with `secretRef`.** Flagger's CloudWatch provider uses the AWS SDK credential chain and does not read `MetricTemplate.spec.provider.secretRef` for AWS access keys. I removed `secretRef` from the CloudWatch MetricTemplates and changed the static-credentials guidance to mount `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` into the Flagger pod through Helm `values.env`.
2. **The error-rate CloudWatch query returned the wrong series to Flagger.** Flagger's CloudWatch provider reads the first `MetricDataResult` value. The original query placed the math expression after the raw metrics and did not set `ReturnData: false`, so Flagger could evaluate `error_count` instead of `error_rate`. I moved the `error_rate` expression first and set `ReturnData: false` on the raw metric queries.
3. **The Helm `metricsServer` comment and example URL were misleading.** `metricsServer` is the Prometheus URL for Flagger's built-in metrics, not a generic CloudWatch/monitoring endpoint. I changed the example to a Prometheus service URL and updated the comment.
4. **The canary `analysis.interval` comment was incorrect.** It described the field as the total number of iterations. I changed the comment to describe it as the analysis interval.
5. **The IRSA explanation still referenced omitted `secretRef`.** I updated it to explain that IRSA removes the need for static AWS credential environment variables because the AWS SDK credential chain can use the projected service account token.
6. **The troubleshooting section listed `MetricNotFound` as a common CloudWatch API error.** `GetMetricData` usually returns no datapoints for missing metric names, dimensions, or time windows rather than a `MetricNotFound` error. I changed this to "No values returned."

## Review Notes
- The Flux HelmRelease uses `apiVersion: helm.toolkit.fluxcd.io/v2`, which is current and valid.
- The `kubectl apply`, `kubectl get`, `kubectl describe`, `kubectl logs`, and `kubectl set image` commands are syntactically valid.
- The CloudWatch examples use placeholder custom namespaces and metric names. Readers must replace these with metrics and dimensions that actually exist in their CloudWatch account.
