# Validation Summary: How to Automate Security Scanning in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Rancher Compliance Scans / CIS benchmark scanning
- Trivy Operator
- GitHub Actions
- Falco
- Prometheus Operator
- Kubernetes
- Slack incoming webhooks

## Sources Consulted
- SUSE Rancher Manager v2.14 compliance scan configuration: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/security/compliance-scans/configuration-reference.html
- SUSE Rancher Manager v2.14 scheduled compliance scans: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/security/compliance-scans/run-a-scan-periodically-on-a-schedule.html
- SUSE Rancher Manager v2.14 compliance report viewing: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/security/compliance-scans/view-reports.html
- SUSE KB on the v2.12+ migration from `rancher-cis-benchmark` to `rancher-compliance`: https://www.suse.com/support/kb/doc?id=000021939
- Rancher compliance-operator API types: https://raw.githubusercontent.com/rancher/compliance-operator/main/pkg/apis/compliance.cattle.io/v1/types.go
- Rancher compliance-operator report creation logic: https://raw.githubusercontent.com/rancher/compliance-operator/main/pkg/securityscan/jobHandler.go
- Trivy Operator overview and installation: https://aquasecurity.github.io/trivy-operator/latest/
- Trivy Operator vulnerability scanning settings: https://aquasecurity.github.io/trivy-operator/v0.30.1/docs/vulnerability-scanning/trivy/
- Trivy Operator VulnerabilityReport schema and labels: https://aquasecurity.github.io/trivy-operator/latest/docs/crds/vulnerability-report/
- Trivy Operator metrics reference: https://aquasecurity.github.io/trivy-operator/v0.22.0/tutorials/integrations/metrics/
- Trivy Operator Helm values: https://raw.githubusercontent.com/aquasecurity/trivy-operator/main/deploy/helm/values.yaml
- Trivy GitHub Action README: https://github.com/aquasecurity/trivy-action
- Falco Helm chart values: https://raw.githubusercontent.com/falcosecurity/charts/master/charts/falco/values.yaml
- Falco rule condition syntax: https://falco.org/docs/concepts/rules/conditions/

## Issues Found
- The description referenced NeuVector for runtime scanning, but the post implemented Falco. I changed the description to match the actual content.
- The Trivy Operator install snippet used an incorrect Helm value name (`operator.concurrentScanJobsLimit`) and the ConfigMap snippet used the wrong ConfigMap name and an invalid severity key. I corrected these to the current documented names.
- The Rancher scan automation section used the retired `cis.cattle.io/v1` API and a custom CronJob wrapper with incorrect report resources. Current Rancher uses `rancher-compliance` and `compliance.cattle.io/v1`, so I replaced the example with the built-in scheduled `ClusterScan` configuration.
- The GitHub Actions example uploaded a SARIF file that it never generated, used a moving `@master` ref for the Trivy action, used an older SARIF upload action, and omitted the required `security-events: write` permission. I fixed the workflow to generate SARIF correctly and use current pinned actions.
- The Falco custom-rule example was written as a standalone ConfigMap that the Helm chart would not load automatically, and the install command enabled deprecated gRPC settings unnecessarily. I converted the rules example to a `falco-values.yaml` `customRules` configuration and removed the deprecated gRPC flag.
- The Falco “network scanning” rule used `fd.sport < 1024`, which does not meaningfully detect container port scanning. I replaced it with a rule that detects common scanning tools launched in containers.
- The PrometheusRule example matched `trivy_image_vulnerabilities` using uppercase severity labels, but the documented metric label values are title-cased (`Critical`, `High`). I corrected the alert expressions.
- The remediation script referenced a nonexistent `trivy-operator.pod.name` label and claimed that a pod label alone prevents routing. I updated it to use the documented Trivy report labels for Pod resources and clarified that a NetworkPolicy must enforce the quarantine label.
- The conclusion overstated Trivy Operator as continuously scanning running containers. I corrected it to describe Trivy Operator as scanning deployed workloads as cluster state changes.

## Review Notes
Rancher is version-sensitive here: Rancher v2.12 and later use `rancher-compliance` and `compliance.cattle.io`, while Rancher v2.11 and earlier used `rancher-cis-benchmark` and `cis.cattle.io`. The post is now accurate for the current Rancher compliance-scan docs. The quarantine script remains an illustrative example and assumes a pre-existing NetworkPolicy that isolates pods labeled `security-quarantine=true`.
