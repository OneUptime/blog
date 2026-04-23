# Validation Summary: How to Set Up Rancher for Financial Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Kubernetes NetworkPolicy
- Kubernetes audit policy / kube-apiserver audit logging
- HashiCorp Vault
- Kubewarden
- NeuVector
- PCI DSS

## Sources Consulted
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 source for audit flag handling: https://github.com/rancher/rke2/blob/master/pkg/executor/staticpod/staticpod.go
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes `kube-apiserver` flag reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Vault Agent Injector installation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/installation
- Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- Kubewarden policy configuration: https://docs.kubewarden.io/howtos/policies
- Kubewarden `trusted-repos` policy: https://github.com/kubewarden/trusted-repos-policy
- Rancher Configure Okta (SAML): https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-okta-saml
- Rancher Users and Groups / session length: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/manage-users-and-groups
- Rancher API token/session TTL settings: https://ranchermanager.docs.rancher.com/v2.13/api/api-tokens
- Rancher Compliance scan configuration reference: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/compliance-scans/configuration-reference
- Rancher Run a Scan Periodically on a Schedule: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan-periodically-on-a-schedule
- NeuVector Compliance & CIS Benchmarks: https://open-docs.neuvector.com/scanning/scanning/compliance/
- NeuVector Registry Scanning Configuration: https://open-docs.neuvector.com/scanning/registry/
- PCI SSC press release for PCI DSS v4.0 changes: https://www.pcisecuritystandards.org/about_us/press_releases/securing-the-future-of-payments-pci-ssc-publishes-pci-data-security-standard-v4-0/
- PCI SSC FAQ 1597 on Requirements 6.3.1 / 6.3.3 / 11.3.1: https://www.pcisecuritystandards.org/faqs/1597/
- PCI SSC FAQ 1087 on quarterly / every-three-month vulnerability scans: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/For-vulnerability-scans-what-is-meant-by-quarterly-or-at-least-once-every-three-months/
- PCI DSS ROC template wording for audit-log retention Requirement 10.7: https://listings.pcisecuritystandards.org/documents/PCI-DSS-v3_2_1-ROC-Reporting-Template.pdf

## Issues Found
- The Vault install command did not enable the Agent Injector even though the next example depended on it. Added `--set injector.enabled=true` to match HashiCorp’s documented installation flow.
- The Vault pod example omitted an explicit service account, making the `payment-service` Vault role mapping ambiguous. Added `serviceAccountName: payment-service` so the example aligns with common Vault Kubernetes auth usage.
- The RKE2 hardening example used `profile: cis-1.23`, which is deprecated in current RKE2 guidance, and it used unsupported top-level `audit-log-*` keys. Updated the example to `profile: cis` and moved audit log settings under `kube-apiserver-arg`, which is how RKE2 exposes those flags.
- The audit policy logged Secrets at `RequestResponse`, which would record secret bodies in the audit log. Changed Secrets auditing to `Metadata` level and moved `omitStages: [RequestReceived]` to the policy level, matching Kubernetes audit policy guidance.
- The Rancher MFA section used an incorrect UI path and referred generically to a session timeout setting. Updated it to Rancher’s current authentication path and the documented `auth-user-session-idle-ttl-minutes` global setting for 15-minute idle timeout behavior.
- The Kubewarden example referenced the wrong policy/module and settings shape (`allowed-image-repositories` / `allowedRegistries`). Replaced it with the documented `trusted-repos` policy and current `registries.allow` configuration.
- The NeuVector compliance section described a non-documented “PCI DSS compliance mode” toggle under Settings. Updated it to the documented `Security Risks -> Compliance Profiles` and `Security Risks -> Compliance` workflow.
- The NeuVector vulnerability scanning section used the wrong UI location and an unverified API example. Replaced it with the documented `Assets -> Registries` periodic scanning workflow.
- The post incorrectly said PCI DSS Requirement 6.3 requires vulnerability scanning. Corrected the text to distinguish Requirement 11 vulnerability scanning from Requirement 6.3 vulnerability management / patching.
- The Rancher scan section used outdated naming and an invalid scheduled scan manifest shape. Replaced it with the documented Compliance scan UI workflow and noted that older releases label the area `CIS Benchmark`.
- The checklist’s audit-log retention wording was inaccurate. Updated it to the PCI wording of 12 months retained with at least the last 3 months immediately available for analysis.
- The checklist referred to a NeuVector “PCI DSS compliance mode,” which is not how the feature is documented. Updated it to configuring the PCI compliance template and exporting reports.

## Review Notes
- The Vault secret path shown in the injector example is still a placeholder path; actual paths depend on the Vault secrets engine layout, such as KV v1 versus KV v2.
- The RKE2 audit-log flags in the example configure local audit logging correctly, but PCI environments typically also forward logs to centralized retention and analysis systems to satisfy operational retention and review requirements.
- Rancher terminology varies by release. Current documentation uses `Compliance`, while older releases used `CIS Benchmark`; the summary fix preserves that distinction so the guidance remains usable across supported environments.
