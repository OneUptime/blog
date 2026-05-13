# Validation Summary: How to Migrate Existing Workloads to Calico on K3s

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- K3s
- Kubernetes
- kubectl
- Calico
- Flannel
- Kubernetes CNI
- Kubernetes NetworkPolicy

## Sources Consulted
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Uninstall Documentation: https://docs.k3s.io/installation/uninstall
- Calico Quickstart for K3s: https://docs.tigera.io/calico/latest/getting-started/kubernetes/k3s/quickstart
- Calico v3.32.0 manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/calico.yaml
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The inventory command used `kubectl get all`, which includes generated resources such as Pods and ReplicaSets, omits some resources needed for migration, and exports server-generated metadata that can break reapply. Changed it to export workload controllers and Services explicitly, clean generated metadata with `jq`, and added NetworkPolicy export.
- PVCs were exported but not reapplied during redeployment. Added `kubectl apply -f pvcs.json` before workload redeployment.
- The tar backup and restore commands used paths that would not reliably restore into `/data`, and the restore command did not pass stdin to `kubectl exec`. Changed the commands to archive the contents of `/data` and restore with `kubectl exec -i ... tar xzf - -C /data`.
- The uninstall step only showed the server uninstall script. Added the K3s agent uninstall script for agent nodes, matching the official K3s uninstall documentation.
- The Calico manifest referenced v3.27.0, while current Calico documentation uses v3.32.0. Updated the manifest URL to v3.32.0.
- K3s custom CNI documentation requires Calico CNI `container_settings.allow_ip_forwarding` to be enabled. Added a command to patch the downloaded Calico manifest before applying it.
- NetworkPolicy objects were not reapplied, which would undermine the post's goal of preserving policy enforcement. Added `kubectl apply -f networkpolicies.json`.

## Review Notes
The guide remains a high-level migration procedure. For production use, readers should still review exported Kubernetes objects before reapplying them, confirm StorageClass and PV behavior for their environment, and test backups before uninstalling K3s because the official uninstall process deletes local K3s datastore and local storage PV data.
