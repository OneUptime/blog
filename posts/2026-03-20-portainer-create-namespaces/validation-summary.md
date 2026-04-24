# Validation Summary: How to Create Namespaces in Portainer for Kubernetes - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- Kubernetes namespaces
- Kubernetes RBAC
- Pod Security Admission
- ResourceQuota
- LimitRange
- NetworkPolicy

## Sources Consulted
- Portainer: Add a new namespace - https://docs.portainer.io/user/kubernetes/namespaces/add
- Portainer: Manage access to a namespace - https://docs.portainer.io/user/kubernetes/namespaces/access
- Portainer: Cluster setup - https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer: Create a Kubernetes security policy - https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-security-policy
- Kubernetes: Namespaces - https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes: `kubectl` command reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/
- Kubernetes: Enforce Pod Security Standards with Namespace Labels - https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes: Object Names and IDs - https://kubernetes.io/docs/concepts/overview/working-with-objects/names/

## Issues Found
- The Portainer UI flow named the wrong button for creating a namespace. Updated `+ Add namespace` to `Add with form` to match the current Portainer documentation.
- The Step 1 form example implied Portainer's namespace form accepts arbitrary labels at creation time. Removed the labels from the form example because the documented form flow covers annotations and quota-related settings; labels are reliably handled through the manifest example.
- The YAML section referred to a generic "YAML editor" and used the removed PodSecurityPolicy term in a comment. Updated the text to Portainer's documented `Create from manifest` flow and changed the comment to Pod Security Admission.
- The Portainer section about setting a per-environment or per-user default namespace was not supported by the current Portainer documentation. Replaced it with the documented feature for restricting access to the built-in `default` namespace.
- The namespace naming rules stated that the `kube-` prefix cannot be used. Updated this to the documented guidance to avoid that prefix, and added the missing rule that names must end with an alphanumeric character.
- The sample `kubectl get namespaces` output omitted standard namespaces that Kubernetes documents by default. Added `kube-node-lease` and `kube-public` to keep the example aligned with the namespace documentation.
- The conclusion and best-practices block implied NetworkPolicy always takes effect. Clarified that enforcement depends on using a CNI/networking solution that supports NetworkPolicy.

## Review Notes
- The namespace manifest that uses `pod-security.kubernetes.io/*` labels is valid, but production clusters often pin `*-version` labels to a Kubernetes minor version to avoid policy drift across upgrades.
- The `kubectl create namespace ... --dry-run=client -o yaml | kubectl apply -f -` pattern is current and valid per the Kubernetes command reference.
- `kubectl` was not installed in the local workspace, so CLI syntax was validated against the official Kubernetes reference documentation rather than local `--help` output.
