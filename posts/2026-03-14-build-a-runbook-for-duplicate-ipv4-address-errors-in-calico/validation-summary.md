# Validation Summary: Building a Runbook for Duplicate IPv4 Address Errors in Calico

## Status
validated

## Post Type
Runbook / Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- kubectl
- calicoctl
- Kubernetes RBAC
- Kubernetes audit logging and events

## Sources Consulted
- Calico Open Source documentation: calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl ipam show: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico documentation: calicoctl ipam check: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico Open Source documentation: calicoctl ipam release: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source documentation: calicoctl datastore migrate lock: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico Open Source documentation: Calico IP address management concepts: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Kubernetes documentation: kubectl auth can-i: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The pod impact commands used `kubectl get pods` without `--no-headers`, which could count the table header as a non-running pod. Added `--no-headers` to the affected commands.
- The IPAM fix section only ran `calicoctl ipam show --show-blocks`, which is diagnostic and does not repair IPAM state. Added the documented `calicoctl ipam check` and `calicoctl ipam release --from-report` workflow with datastore lock and unlock commands.
- The RBAC check used `kubectl auth can-i create ... --all-namespaces --list`, combining a specific permission check with list mode. Replaced it with a valid `kubectl auth can-i create globalnetworkpolicies.crd.projectcalico.org` command and clarified that it checks the current credentials.
- The security hardening command described `kubectl get events` as a way to review resource changes from audit logging. Clarified that this reviews recent Calico events and that Kubernetes audit logs are needed for full change history.

## Review Notes
The runbook is technically relevant and the remaining commands are valid for common Calico-on-Kubernetes installations. Namespace and label choices may vary by installation method, so operators should adjust `calico-system` and `k8s-app=calico-node` if their cluster uses different deployment conventions.
