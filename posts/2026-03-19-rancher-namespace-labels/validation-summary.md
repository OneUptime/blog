# Validation Summary: How to Manage Labels and Annotations for Namespaces in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes namespaces
- Kubernetes labels and annotations
- `kubectl`
- NetworkPolicy
- Pod Security Admission
- Terraform Rancher2 provider
- Bash
- `jq`

## Sources Consulted
- Rancher docs: Projects and Kubernetes Namespaces with Rancher — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/projects-and-namespaces
- Rancher docs: Namespaces — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-namespaces
- Rancher docs: Projects workflow API guide — https://ranchermanager.docs.rancher.com/api/workflows/projects
- Kubernetes docs: Labels and Selectors — https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes docs: Annotations — https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kubernetes docs: Network Policies — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes docs: Enforce Pod Security Standards with Namespace Labels — https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes docs: `kubectl label` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes docs: `kubectl annotate` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate
- Terraform Provider Rancher2: `rancher2_namespace` resource — https://registry.terraform.io/providers/rancher/rancher2/latest/docs/resources/namespace

## Issues Found
1. **The `field.cattle.io/projectId` guidance was too broad.** The post labeled this annotation as Rancher-managed metadata that should not be modified, but Rancher’s official docs use it to assign a namespace to a project. I changed the inline comment and best-practices guidance so they describe it as the Rancher project-assignment annotation and advise careful, intentional changes instead of a blanket prohibition.

2. **The second NetworkPolicy example was described as a deny policy even though NetworkPolicy ingress rules are allowlists.** The `namespaceSelector` with `NotIn` allows traffic from namespaces whose `environment` label is not `development`; it does not create an explicit deny rule. I renamed the example comment and policy name to match the behavior defined by Kubernetes NetworkPolicy semantics.

3. **The best-practices reference to “resource quota selectors” was inaccurate in this context.** The post implied namespace labels are leveraged through resource quota selectors, which is not how Kubernetes or Rancher resource quota configuration works here. I narrowed the statement to the two correct policy uses covered in the post: NetworkPolicy and Pod Security Admission.

## Review Notes
- No syntax or API issues were found in the `kubectl`, `jq`, Bash, or Terraform examples after cross-checking them against the current upstream references.
- The Pod Security Admission examples are valid, but upstream Kubernetes documentation recommends using the optional `pod-security.kubernetes.io/*-version` labels when you want policy behavior pinned across Kubernetes minor-version upgrades.
- `kubectl` is not installed in this environment, so command validation was done against the official generated `kubectl` reference rather than local `--help` output.
