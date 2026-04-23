# Validation Summary: How to Set Up Rancher for Government and FedRAMP - Setup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes
- FedRAMP
- FIPS
- DISA STIG
- Rancher Logging / Logging Operator
- Splunk HEC
- Microsoft AD FS / SAML
- SUSE Security (NeuVector)

## Sources Consulted
- RKE2 FIPS support: https://docs.rke2.io/security/fips_support
- RKE2 CIS hardening guide: https://docs.rke2.io/security/hardening_guide
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 default pod security standards: https://docs.rke2.io/security/pod_security_standards
- RKE2 certificate management: https://docs.rke2.io/security/certificates
- RKE2 secrets encryption: https://docs.rke2.io/security/secrets_encryption
- RKE2 network options: https://docs.rke2.io/networking/basic_network_options
- Kubernetes Pod Security Admission configuration: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Rancher logging overview: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/logging.html
- Rancher logging outputs and clusteroutputs: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/custom-resource-configuration/outputs-and-clusteroutputs.html
- Rancher ADFS / SAML configuration: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/rancher-admin/users/authn-and-authz/microsoft-ad-federation-service-saml/microsoft-ad-federation-service-saml.html
- Rancher users, groups, and session TTL settings: https://documentation.suse.com/cloudnative/rancher-manager/v2.9/en/rancher-admin/users/authn-and-authz/manage-users-and-groups.html
- Rancher compliance scans: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/security/compliance-scans/run-a-scan.html
- Logging operator Splunk output and secret handling: https://kube-logging.dev/docs/configuration/plugins/outputs/splunk_hec/ and https://kube-logging.dev/docs/configuration/plugins/outputs/secret/
- SUSE Security compliance and response rules: https://documentation.suse.com/external-tree/en-us/cloudnative/security/5.4/en/compliance.html and https://documentation.suse.com/en-us/cloudnative/security/5.4/en/responserules.html
- FedRAMP MFA and authentication guidance: https://help.fedramp.gov/hc/en-us/articles/27704070857371-Does-a-cloud-service-provider-CSP-need-to-implement-FIPS-validated-multi-factor-authentication-MFA-prior-to-a-cloud-service-offering-CSO-achieving-FedRAMP-Ready-or-can-it-be-added-to-the-Plan-of-Action-and-Milestones-POA-M-and-addressed-later and https://www.fedramp.gov/rfcs/0003/

## Issues Found
- The post used invalid or undocumented RKE2 config keys for FIPS and audit logging (`fips`, `audit-log-path`, `audit-log-maxage`). I removed those and aligned the example with documented RKE2 configuration.
- The post used the older `profile: cis-1.23` guidance as the main recommendation. I updated it to the current `profile: cis` guidance for RKE2 v1.25+ and noted the FIPS-relevant Canal CNI requirement.
- The original Step 2 referenced an audit policy file before creating it, which could cause startup failure. I moved the audit policy wiring to Step 5 and added the required restart step.
- The Pod Security Admission example did not match current RKE2 hardening behavior. I replaced it with a configuration aligned to the RKE2 default restricted PSA setup and clarified Rancher namespace exemption requirements.
- The custom CA certificate path was wrong. I corrected it from `/etc/rancher/rke2/server/tls/` to `/var/lib/rancher/rke2/server/tls/`.
- The Rancher Logging section was incomplete for RKE2. I corrected it to enable the RKE2 and kube-audit additional logging sources and documented the `systemdLogPath` requirement.
- The Splunk `ClusterOutput` example was not valid because `hec_token` and `ca_file` require secret-based definitions, not plain inline values or file paths. I replaced it with a valid `Secret` + `ClusterOutput` example and added the missing `ClusterFlow`, without which logs would not actually be forwarded.
- The identity section incorrectly stated that FedRAMP requires PIV/CAC specifically and used outdated Rancher UI navigation. I corrected this to FedRAMP MFA guidance, current Rancher auth paths, and the documented session TTL setting.
- The compliance monitoring section used outdated Rancher navigation and version-specific profile wording. I updated it to the current Compliance scan UI and made the profile guidance release-aware instead of hardcoding an older benchmark.
- The conclusion overstated that the Rancher stack provides most FedRAMP controls “out of the box.” I softened this to accurately describe the stack as providing technical building blocks rather than an authorization by itself.

## Review Notes
RKE2 documentation still brands its feature set as FIPS 140-2 support, while current FedRAMP guidance is written more generally as FIPS 140-validated cryptography. The updated post uses the broader FedRAMP wording where appropriate while keeping the RKE2-specific terminology where it is the product’s documented feature description.
