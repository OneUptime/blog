# Validation Summary: How to Audit Kubernetes Cluster Security Posture with Kubescape Frameworks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubescape CLI
- Kubescape Operator
- Helm
- jq
- GitHub Actions
- Prometheus metrics

## Sources Consulted
- Kubescape scanning documentation: https://kubescape.io/docs/scanning/
- Kubescape client installation documentation: https://kubescape.io/docs/install-cli/
- Kubescape frameworks and controls overview: https://kubescape.io/docs/frameworks-and-controls/
- Kubescape control configuration documentation: https://kubescape.io/docs/frameworks-and-controls/configuring-controls/
- Kubescape risk acceptance / exceptions documentation: https://kubescape.io/docs/accepting-risk/
- Kubescape Operator overview: https://kubescape.io/docs/operator/
- Kubescape scheduled scans documentation: https://kubescape.io/docs/operator/scheduled-scans/
- Kubescape continuous scanning documentation: https://kubescape.io/docs/operator/continuous-scanning/
- Kubescape GitHub Actions guide: https://kubescape.io/docs/guides/kubescape-gha/
- Kubescape Operator Helm chart values: https://github.com/kubescape/helm-charts/blob/main/charts/kubescape-operator/values.yaml
- Kubescape Operator API examples: https://github.com/kubescape/operator
- Kubescape CLI v4.0.9 local help output and test scan output

## Issues Found
- The JSON result examples used non-current paths such as `.results[]`, `.summaryDetails.score`, and `.summaryDetails.controls.passed`. Updated the jq examples to use Kubescape v4 JSON fields including `.summaryDetails.complianceScore` and `.summaryDetails.controls`.
- The CIS framework name `cis-v1.23-t1.0.1` is not listed by the current Kubescape CLI. Replaced it with the supported `cis-v1.12.0` framework name throughout commands and scheduler examples.
- The MITRE example claimed `--controls-config` could focus on tactics. Replaced it with a namespace-scoped scan example because `--controls-config` is for control parameter input.
- The workload command `kubescape scan workload deployment --all-namespaces` is invalid. Replaced it with `kubescape scan --verbose` for scanning all resources visible to the current context.
- The custom control threshold section used an invalid controls-config structure. Updated it to describe supported control parameters and changed the example to the JSON controls input format used by Kubescape.
- The exceptions example used an invalid YAML schema. Replaced it with the documented JSON array format using `policyType`, `actions`, `resources`, and `posturePolicies`.
- The operator scheduled scan example used an unsupported ConfigMap shape. Replaced it with Helm values for `kubescapeScheduler.scanSchedule` and `kubescapeScheduler.requestBody`.
- The immediate operator scan command attempted to exec into a deployment and run a CLI framework scan. Replaced it with `kubescape operator scan configurations --namespace kubescape`.
- The historical scan section described querying a `/v1/scans` endpoint from `kubescape-storage`, but the operator documentation exposes current scan data as Kubernetes API resources and notes in-cluster results are ephemeral. Updated the section to query Kubescape API resources and workload configuration scan summaries.
- The CI example used deprecated `--fail-threshold` for a compliance gate. Replaced it with `--compliance-threshold` and updated GitHub Actions `checkout` and `upload-artifact` actions to current major versions.
- The executive report jq example used outdated JSON fields. Updated it to use `generationTime`, `summaryDetails.complianceScore`, and failed controls from `summaryDetails.controls`.
- The Prometheus example used an incorrect Helm key. Updated it to enable the Kubescape Prometheus exporter capability and the Kubescape service monitor, then query the `prometheus-exporter` service via port-forwarding.

## Review Notes
The post is now accurate for Kubescape CLI v4.0.9 and the current Kubescape Operator Helm chart as of 2026-06-04. A live Kubernetes cluster was not available, so cluster-dependent operator commands were verified against official documentation, chart values, and CLI help rather than executed end to end.
