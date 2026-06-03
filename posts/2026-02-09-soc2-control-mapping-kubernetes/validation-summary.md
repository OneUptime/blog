# Validation Summary: How to Use SOC2 Control Mapping for Kubernetes Infrastructure

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- OPA Gatekeeper
- Rego
- Kubernetes admission webhooks
- Kubernetes CronJob
- Kubernetes RBAC and ServiceAccounts
- GitHub Actions
- Conftest
- jq and kubectl
- SOC2 Trust Services Criteria control mapping

## Sources Consulted
- OPA Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install
- OPA Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit
- OPA Gatekeeper replicating data documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/sync
- OPA Gatekeeper constraints and enforcement actions documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- OPA Rego policy reference: https://www.openpolicyagent.org/docs/policy-reference
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/cron-job-v1/
- GitHub Actions checkout action: https://github.com/actions/checkout
- GitHub Actions upload-artifact action: https://github.com/actions/upload-artifact
- Open Policy Agent Conftest releases: https://github.com/open-policy-agent/conftest/releases
- AICPA Trust Services Criteria document: https://us.aicpa.org/content/dam/aicpa/interestareas/frc/assuranceadvisoryservices/downloadabledocuments/trust-services-criteria-redlined.pdf

## Issues Found
- The description mentioned Kyverno, but the post only uses OPA Gatekeeper. Removed Kyverno from the description.
- The Gatekeeper install command used the `master` branch manifest. Updated it to the current documented release manifest, `v3.22.2`, for reproducible installs.
- The Gatekeeper `Config` example included `spec.audit` fields that are not part of the Gatekeeper `Config` resource. Removed that block and clarified that audit interval and violation limits are runtime flags.
- The post used `templates.gatekeeper.sh/v1beta1` for ConstraintTemplates. Updated examples to `templates.gatekeeper.sh/v1`, which is the current documented API version, and added minimal structural schemas for templates without parameters.
- The audit logging Rego example used the `in` keyword with legacy Gatekeeper Rego syntax. Replaced it with helper rules that work with the shown `targets[].rego` format.
- The post mapped encryption controls to SOC2 CC6.6, but the AICPA Trust Services Criteria describe CC6.6 as controls for threats from outside system boundaries. Remapped the encryption examples to CC6.1, whose points of focus include protected information assets at rest, during processing, and in transmission.
- The control matrix referenced PodSecurityPolicy evidence even though PodSecurityPolicy has been removed from Kubernetes. Replaced it with Pod Security Admission or policy controller audit logs.
- The compliance report script counted admission reviews and denials by grepping Gatekeeper controller logs, which is not a reliable documented evidence source. Replaced those counts with constraint annotation and current audit violation counts from Gatekeeper constraint status.
- The CronJob example mounted `/reports` but the script defaulted to a relative output directory. Added an `OUTPUT_DIR=/reports` environment variable to the CronJob example and clarified that the referenced ServiceAccount, ConfigMap, PVC, and RBAC permissions must exist.
- The GitHub Actions workflow used older action versions and an older Conftest release. Updated `actions/checkout` to v6, `actions/upload-artifact` to v7, and Conftest to v0.62.0.

## Review Notes
- The example uses an `encrypted: true` annotation on PVCs as an organization-specific policy signal. Kubernetes does not enforce storage encryption from that annotation by itself; auditors would still need evidence from the storage provider or CSI driver configuration.
- The Gatekeeper constraints are examples for mapping controls to policy evidence. A SOC2 auditor will still expect supporting evidence such as access reviews, Kubernetes audit logs, cloud provider encryption settings, monitoring alerts, and change approval records.
