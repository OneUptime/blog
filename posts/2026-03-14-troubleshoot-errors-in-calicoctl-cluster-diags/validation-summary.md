# Validation Summary: Troubleshooting Errors in calicoctl cluster diags

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Kubernetes RBAC
- Kubernetes CustomResourceDefinitions

## Sources Consulted
- Calico official `calicoctl cluster diags` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico official `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico official `calicoctl` user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico official Kubernetes datastore setup for `calicoctl`: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico official end-user RBAC examples: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/end-user-rbac
- Kubernetes official RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The introduction described `calicoctl cluster diags` mainly as reading from the Calico datastore. The official command reference shows it also collects Kubernetes version data, core Kubernetes resources, workload details, and component logs. Updated the wording to mention Kubernetes API access, datastore access, Calico resources, Kubernetes resources, and logs.
- The RBAC example was too narrow for the documented diagnostic collection. It granted Calico CRD reads and only `nodes`, `pods`, and `namespaces` from the core Kubernetes API, but `cluster diags` also collects resources such as services, endpoints, configmaps, persistent volumes, persistent volume claims, deployments, daemonsets, storage classes, pod logs, events, and Tigera operator resources when present. Expanded the ClusterRole rules accordingly.
- The RBAC example implied a fixed `kube-system/calicoctl` ServiceAccount. Added wording that the ClusterRoleBinding subject must match the user or ServiceAccount that actually runs `calicoctl`.

## Review Notes
The `calicoctl get` commands, `--all-namespaces` usage, `DATASTORE_TYPE=kubernetes` setup, `kubectl cluster-info`, CRD discovery command, and `tar tzf` verification command are consistent with the referenced documentation and standard CLI behavior. The example RBAC is intentionally broad for diagnostics; production environments may prefer a narrower role based on the exact Calico installation and support requirements.
