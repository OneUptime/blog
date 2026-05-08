# Validation Summary: Securing Calicoctl Kubernetes API Datastore Configuration

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- Calico / calicoctl
- Kubernetes API datastore
- Kubernetes RBAC
- Kubernetes service account tokens
- Kubernetes kubeconfig files
- Kubernetes audit logging

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to the Kubernetes API datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: End user RBAC - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/end-user-rbac
- Calico documentation: Install calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes documentation: kubectl create token - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes documentation: Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The RBAC examples used `apiGroups: ["projectcalico.org"]` for calicoctl access through the Kubernetes API datastore. For direct calicoctl datastore access, Calico's documented RBAC examples use the backing CRD API group `crd.projectcalico.org`. Updated the Calico resource RBAC rules to use `crd.projectcalico.org`.
- The network policy operator role did not include `get` access to `clusterinformations`, which Calico documents as required for calicoctl version mismatch checks. Added a least-privilege `clusterinformations` rule.
- The prerequisite pinned calicoctl to v3.27 or later, but Calico documentation recommends using a calicoctl version that matches the Calico version running in the cluster. Updated the prerequisite accordingly.
- The kubeconfig generation commands modified the user's default kubeconfig and used the current context name as the cluster name. Updated the commands to create `~/.kube/calico-config`, preserve the current cluster connection, set the restricted service account credentials in that file, and switch that file to the restricted context.
- The short-lived token example generated a token but did not put it into the kubeconfig used by calicoctl. Added a `kubectl config --kubeconfig=/etc/calicoctl/kubeconfig set-credentials ... --token="$TOKEN"` step.
- The audit policy used `projectcalico.org` as the resource group for calicoctl datastore operations. Updated it to `crd.projectcalico.org` to match the direct Kubernetes datastore API group used by calicoctl.

## Review Notes
- The audit log verification command is environment-dependent. Kubernetes audit records may be written to a file or webhook backend depending on kube-apiserver flags, so the `kubectl logs` example may need adjustment for managed clusters or non-stdout audit log configurations.
