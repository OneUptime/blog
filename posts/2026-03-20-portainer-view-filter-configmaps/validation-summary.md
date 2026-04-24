# Validation Summary: How to View and Filter ConfigMaps in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- ConfigMaps
- kubectl
- jq
- Bash

## Sources Consulted
- Portainer ConfigMaps & Secrets documentation: https://docs.portainer.io/sts/user/kubernetes/configurations
- Portainer Add a ConfigMap documentation: https://docs.portainer.io/sts/user/kubernetes/configurations/add
- Kubernetes ConfigMaps concept documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes task documentation for configuring Pods to use ConfigMaps: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/#describe
- Kubernetes JSONPath support reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
1. **Portainer list view details did not match current documentation**: The post described namespace selection as a dropdown and showed a sample table with a `Keys` column. Portainer’s current ConfigMaps view uses a namespace **Filter** control and the documented UI shows `Name`, `Namespace`, and `Created` columns. Updated Step 1 to match the documented UI.

2. **Creation time was described as modification time**: The post said sorting by **Created** helps find recently modified configs. `Created` reflects creation timestamp, not later edits. Updated the wording to “recently created configs”.

3. **Portainer detail view description was too specific and included an unsupported Events section claim**: The post claimed a ConfigMap detail view includes an **Events** section. Portainer’s published ConfigMap docs do not document that view or an events panel for ConfigMaps, but they do document limited information for `external` ConfigMaps. Reworded Step 3 to focus on reviewing metadata and data, and added the documented caveat for `external` resources.

4. **`kubectl` JSONPath output was being parsed as JSON**: The post used `-o jsonpath='{.data}'` and then piped the result into Python JSON tooling. Kubernetes documents that `kubectl` JSONPath output prints the selected object as a string representation, so this is not a reliable JSON input for parsers when selecting map objects like `.data`. Replaced those examples with `-o json | jq ...` in Steps 5 and 9.

5. **ConfigMap export example used an inaccurate comment and brittle metadata stripping**: The post claimed the namespace export excluded system ConfigMaps, but the command did not. It also used `grep -v` against YAML to remove cluster-specific metadata, which was incomplete and unsafe. Corrected the comment and replaced the cleanup example with a `jq 'del(...)'` JSON export.

6. **Reference-finding commands missed common ConfigMap reference patterns**: The original pod and deployment queries only covered direct volume references and `envFrom`, which would miss `env.valueFrom.configMapKeyRef` and init container references. Expanded the `jq` examples in Steps 6 and 7 to cover those common patterns.

## Review Notes
- The post is now technically sound for a current Portainer and Kubernetes workflow.
- The “unused ConfigMaps” check remains a heuristic. It can catch common declarative pod references, but it cannot detect applications that read ConfigMaps dynamically through the Kubernetes API at runtime.
- The `jq`-based commands assume `jq` is installed on the machine where the commands are run.
- `kubectl get ... --sort-by='.metadata.creationTimestamp'` sorts by creation timestamp; if a reader wants newest items last or first, they may need to post-process the output accordingly.
