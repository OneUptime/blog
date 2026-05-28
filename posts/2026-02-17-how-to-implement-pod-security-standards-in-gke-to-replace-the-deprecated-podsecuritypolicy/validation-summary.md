# Validation Summary: Use Pod Security Standards in GKE to Replace the Deprecated PodSecurityPolicy

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Pod Security Standards
- Kubernetes Pod Security Admission
- PodSecurityPolicy migration
- kubectl namespace labels
- GKE Policy Controller / Gatekeeper constraints
- Google Cloud Logging and GKE audit logs

## Sources Consulted
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes task: Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- GKE: Apply predefined Pod-level security policies using PodSecurity: https://cloud.google.com/kubernetes-engine/docs/how-to/podsecurityadmission
- GKE: Migrate from PodSecurityPolicy to the PodSecurity admission controller: https://cloud.google.com/kubernetes-engine/docs/how-to/migrate-podsecuritypolicy
- GKE Policy Controller constraint template library: https://cloud.google.com/kubernetes-engine/policy-controller/docs/latest/reference/constraint-template-library

## Issues Found
- The post stated that the Restricted Pod Security Standard requires a read-only root filesystem. Kubernetes Restricted does not require `readOnlyRootFilesystem`; it requires controls such as non-root execution, `allowPrivilegeEscalation: false`, dropping `ALL` capabilities, explicit seccomp, and allowed volume types. Updated the description and workload guidance to present read-only root filesystems as optional hardening.
- The list of key Restricted requirements was too broad while omitting important context. Updated it to say the listed items are key Linux requirements and added allowed volume types in the earlier Restricted description.
- The GKE audit log query looked for PodSecurity violations in `protoPayload.response.metadata.annotations`, but GKE documents these under Cloud Logging labels such as `labels."pod-security.kubernetes.io/audit-violations"` and enforcement failures under `protoPayload.response.reason="Forbidden"`. Updated the `gcloud logging read` query accordingly.
- The post recommended labeling `kube-system` as privileged without noting GKE behavior. Added a short note that supported GKE versions ignore PodSecurity labels on `kube-system`.

## Review Notes
The remaining commands and manifests align with current Kubernetes and GKE documentation. The Policy Controller `K8sAllowedRepos` example uses the documented constraint kind, API version, `match`, and `parameters.repos` schema.
