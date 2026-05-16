# Validation Summary: How to Set Up HIPAA Compliance on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes API server authentication, authorization, audit policy, RBAC, NetworkPolicy, Pod Security Admission, and Deployments
- Longhorn encrypted volumes
- Istio mutual TLS
- AWS S3 Object Lock
- Velero backups and restores
- Kubescape
- OPA Gatekeeper
- HIPAA Security Rule technical safeguards

## Sources Consulted
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux logging documentation: https://www.talos.dev/latest/talos-guides/configuration/logging/
- Kubernetes authentication documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes audit documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Longhorn volume encryption documentation: https://longhorn.io/docs/latest/advanced-resources/security/volume-encryption/
- Longhorn StorageClass parameter documentation: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy documentation: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- AWS CLI `put-object-lock-configuration` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object-lock-configuration.html
- Velero disaster recovery documentation: https://velero.io/docs/main/disaster-case/
- Kubescape scanning documentation: https://kubescape.io/docs/scanning/
- OPA Gatekeeper how-to documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto
- HHS HIPAA Security Rule summary: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- HHS Security Rule documentation retention guidance: https://www.hhs.gov/sites/default/files/ocr/privacy/hipaa/administrative/securityrule/pprequirements.pdf

## Issues Found
- The RBAC example described an "explicit deny" for Secrets. Kubernetes RBAC permissions are additive and do not have deny rules, so I changed the comment to state that the role simply grants no Secrets permissions.
- The Longhorn encrypted StorageClass set `encrypted: "true"` but did not provide the required CSI secret references for encrypted volumes. I added a Longhorn crypto Secret and the provisioner, node-publish, node-stage, and node-expand secret parameters.
- The Istio example used the obsolete `values.global.mtls.enabled` install value. I changed it to install the default profile, label the namespace for sidecar injection, and apply a `security.istio.io/v1` `PeerAuthentication` with `STRICT` mTLS.
- The Kubernetes audit policy was shown as a standalone policy, but Talos expects it under `cluster.apiServer.auditPolicy`. I embedded the policy in the Talos cluster configuration.
- The automatic logoff section implied that the Kubernetes API server setting controlled all user sessions. I changed the wording to clarify that the Talos setting affects admin kubeconfig lifetime, the API server flag affects service account tokens, and OIDC user session expiration belongs in the identity provider.
- The audit retention wording stated that HIPAA requires retaining audit logs for six years. The Security Rule explicitly applies the six-year period to required documentation; audit log retention should be documented and is often aligned with that period. I corrected the text and summary wording.
- The ingress NetworkPolicy used separate `namespaceSelector` and `podSelector` entries, which made them OR conditions. I combined them into one peer so both the trusted namespace label and gateway pod label must match.
- The Deployment example omitted the required `spec.selector` and pod template labels for `apps/v1` Deployments. I added matching selectors and labels.
- The integrity example implied Pod Security Admission enforces read-only root filesystems. The Restricted Pod Security Standard has no opinion on `readOnlyRootFilesystem`, so I revised the comment and added an explicit pod `seccompProfile: RuntimeDefault`.
- The Kubescape example used a `nist` framework name that is not shown in current Kubescape getting-started/scanning docs. I changed it to the documented `nsa` framework and removed the unverified `--submit` flag.
- The Gatekeeper `K8sRequiredLabels` constraint used a parameter shape that did not match the official example. I changed it to the documented list-of-strings format and added a comment that the ConstraintTemplate must already be installed.

## Review Notes
- The examples are implementation guidance, not a full HIPAA compliance program. The post correctly notes that policies, training, risk assessments, and BAAs are still required outside the technical controls.
- The OIDC example assumes the identity provider emits a matching `hipaa_trained=true` claim for trained users.
- Longhorn encrypted volumes also require node support for `dm_crypt` and `cryptsetup`, which must be satisfied by the Talos installation and extensions used in the target cluster.
