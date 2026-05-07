# Validation Summary: How to Harden Rancher for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Helm
- Kubernetes NetworkPolicy
- Kubernetes audit logging
- etcd
- cert-manager / Let's Encrypt

## Sources Consulted
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 CIS Self-Assessment Guide v1.23: https://docs.rke2.io/security/cis_self_assessment123
- Rancher install/upgrade on Kubernetes: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Choosing a Rancher version: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/choose-a-rancher-version
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher API tokens: https://ranchermanager.docs.rancher.com/api/api-tokens
- Rancher cluster and project roles: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher compliance scans overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans
- Rancher compliance scan guides: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides
- Rancher compliance scan run workflow: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan
- Kubernetes audit logging: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit policy API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes namespaces and immutable namespace label: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
- Kubernetes network policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Official Rancher chart service template: https://github.com/rancher/rancher/blob/release/v2.13/chart/templates/service.yaml
- Official Rancher chart deployment template: https://github.com/rancher/rancher/blob/release/v2.13/chart/templates/deployment.yaml
- Official Rancher chart values: https://github.com/rancher/rancher/blob/release/v2.13/chart/values.yaml

## Issues Found
- The post used the obsolete `cis-1.6` RKE2 profile and overstated that RKE2 is CIS compliant by default. I changed this to the current `cis` profile and corrected the explanation to match current RKE2 hardening guidance.
- The production install examples used `rancher-latest`, which Rancher recommends for testing rather than production. I switched the commands to `rancher-stable` and added the missing Helm repository setup.
- The Let's Encrypt example omitted operational prerequisites. I added that cert-manager must already be installed and that port 80 must be reachable for HTTP-01 validation.
- The custom certificate example did not mention the private CA requirement. I added the note about creating the `tls-ca` secret and setting `privateCA=true` when using a private CA.
- The NetworkPolicy example was incorrect for a standard Rancher ingress deployment because it allowed only port `443` to the Rancher pods. Rancher’s ingress normally forwards traffic to the Rancher service on port `80`, so I changed the example accordingly and scoped it to ingress-controller traffic inside the cluster.
- The Kubernetes audit logging section showed only an audit policy file and did not show how to make RKE2 use it. I added the `audit-policy-file` configuration and the required `rke2-server` restart step.
- The Rancher API audit log Helm example omitted `auditLog.enabled=true`, so the audit logging settings would not actually take effect. I added the missing flag.
- The RBAC section mixed cluster roles and project roles and described `Cluster Member` inaccurately. I corrected the role descriptions and clarified that `Read-Only` is a project-scoped role.
- The post used unsupported or outdated Helm environment variable examples for restricting the default admin, configuring external authentication, and token TTLs. I removed those snippets and replaced them with documented guidance: reset the bootstrap admin password after first login, configure auth providers through the Rancher UI or API, and set `auth-token-max-ttl-minutes` in Global Settings.
- The etcd section implied that manual `etcd-arg` settings were needed for mutual TLS and referred to “etcd encryption at rest” while showing `secrets-encryption`. I corrected this to reflect RKE2 defaults for embedded etcd mTLS and clarified that `secrets-encryption: true` enables Kubernetes Secret encryption at rest.
- The security scan section referred to the older CIS Benchmark workflow. I updated it to the current Rancher Compliance app and scan workflow.
- The checklist contained outdated terminology. I updated it to refer to Compliance scans and Pod Security Standards, and to distinguish Kubernetes Secret encryption at rest from generic “etcd encryption.”

## Review Notes
- Rancher’s token model is evolving: Rancher v2.13 introduced `tokens.ext.cattle.io`, and legacy v3 API tokens are being phased out starting in v2.14. The post’s UI-focused API key guidance is still valid, but future automation examples should prefer the newer token APIs.
- The NetworkPolicy example now assumes the common `ingress-nginx` namespace and Rancher’s default ingress-to-service HTTP flow. If a deployment uses a different ingress controller or sets `service.disableHTTP=true`, the selector or backend port should be adjusted accordingly.
