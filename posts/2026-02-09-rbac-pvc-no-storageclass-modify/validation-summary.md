# Validation Summary: How to Configure RBAC to Allow PersistentVolume Claim Creation Without Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- PersistentVolumeClaims
- PersistentVolumes
- StorageClasses
- ResourceQuotas
- Validating admission webhooks
- Kubernetes audit logging
- jq
- AWS EBS CSI driver

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Dynamic Volume Provisioning documentation: https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Admission Webhook documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Amazon EKS StorageClass parameters reference: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- AWS EBS CSI driver documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver
- jq manual: https://jqlang.org/manual/

## Issues Found
- The PVC creator ClusterRole included PersistentVolume read permissions, but the example binds it with a namespaced RoleBinding. Kubernetes only grants ClusterRole rules for namespaced resources when referenced by a RoleBinding, so the PersistentVolume rule would only be effective through a ClusterRoleBinding. Added a clarification comment.
- The admission webhook read the namespace from `pvc.metadata.namespace`. For namespaced admission requests, `request.namespace` is the reliable field supplied by the AdmissionReview. Updated the example to use `req['namespace']`.
- The default AWS StorageClass example used the removed in-tree `kubernetes.io/aws-ebs` provisioner and the older `fsType` parameter. Updated it to use the AWS EBS CSI provisioner `ebs.csi.aws.com` and `csi.storage.k8s.io/fstype`.
- The jq example used invalid jq syntax for checking whether a verb was in a list. Replaced it with a portable explicit boolean expression.
- The Prometheus alert example used `apiserver_audit_event_total` with object and user labels that Kubernetes does not expose on that metric. Replaced it with guidance to alert from exported audit logs using the relevant JSON fields.

## Review Notes
- The webhook example is illustrative and omits deployment details such as the Service, TLS certificate management, and CA bundle configuration.
- The storage usage shell script assumes capacities are reported in Gi and does not normalize other Kubernetes quantity units.
