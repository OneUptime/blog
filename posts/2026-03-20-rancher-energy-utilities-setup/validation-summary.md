# Validation Summary: How to Set Up Rancher for Energy and Utilities

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- K3s
- Kubernetes Deployments, NetworkPolicies, RBAC, CronJobs, and audit policies
- Prometheus and Prometheus Operator (`PrometheusRule`, PromQL)
- NERC CIP
- SCADA protocols (DNP3 and Modbus)
- Advanced Metering Infrastructure (AMI)

## Sources Consulted
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes NetworkPolicies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes RBAC: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- K3s air-gap install: https://docs.k3s.io/installation/airgap
- K3s installation configuration: https://docs.k3s.io/installation/configuration
- K3s agent CLI: https://docs.k3s.io/cli/agent
- Rancher overview: https://ranchermanager.docs.rancher.com/v2.13/getting-started/overview
- Rancher registered clusters: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Prometheus query functions (`abs`): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference (`PrometheusRule`): https://prometheus-operator.dev/docs/api-reference/api/
- NERC CIP-007-6: https://www.nerc.com/pa/Stand/Reliability%20Standards/CIP-007-6.pdf

## Issues Found
- All `apps/v1` `Deployment` examples were missing `.spec.selector` and matching pod template labels, which makes those manifests invalid in current Kubernetes. Added explicit selectors and `template.metadata.labels` to each deployment example.
- The `NetworkPolicy` used selector structure that broadened access instead of tightly constraining it. Reworked the example to deny all ingress and allow egress only to the historian service in the IT zone, matching Kubernetes `to`/`from` selector semantics.
- The audit policy mapped NERC CIP controls inaccurately and used `RequestResponse` for `secrets`, which would record request and response bodies rather than just metadata. Updated the text to describe audit logging as evidence support, not full compliance, and changed the policy to `Metadata` level with standard non-resource URL handling.
- The RBAC example only created a `Role`, which does not grant permissions by itself. Added a `RoleBinding` so the example actually assigns the read-only role to an operator group.
- The K3s air-gap example pointed `K3S_URL` at Rancher Manager, but `K3S_URL` is the K3s server endpoint used by agents. Updated the example to join a local K3s server and clarified that Rancher manages the cluster after import.
- The architecture diagram placed the historian in the OT DMZ while the workload examples referenced `historian.it-zone.svc`. Moved the historian into the Enterprise IT zone in the diagram so the text and manifests are internally consistent.
- The conclusion said the audit logging shown was "NERC CIP-compliant". Revised this to avoid overstating what Kubernetes audit logging alone provides.

## Review Notes
- The internal registry image names, IPs, and hostnames are environment-specific placeholders; they are syntactically plausible but not independently verifiable from public vendor documentation.
- `PrometheusRule` resources in Rancher Monitoring may need deployment-specific labels depending on the Prometheus `ruleSelector` configuration in the installed chart. The manifest structure in the post is valid, but label requirements can vary by installation.
