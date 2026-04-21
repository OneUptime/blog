# Validation Summary: How to Toggle System Resource Visibility in Portainer for Kubernetes (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- Kubernetes namespaces
- Kubernetes system resources

## Sources Consulted
- Portainer Kubernetes ConfigMaps & Secrets documentation: https://docs.portainer.io/user/kubernetes/configurations
- Portainer Kubernetes Services documentation: https://docs.portainer.io/user/kubernetes/networking/services
- Portainer Kubernetes namespace management documentation: https://docs.portainer.io/user/kubernetes/namespaces/manage
- Portainer Kubernetes environment documentation: https://docs.portainer.io/admin/environments/add/kubernetes
- Portainer Agent on Kubernetes documentation: https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Kubernetes namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes ComponentStatus API reference: https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/component-status-v1/
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
1. **Incomplete and over-specific system namespace description**: The post listed `kube-system`, `kube-public`, and `portainer` as the namespaces where Kubernetes system resources run. Kubernetes starts with `default`, `kube-system`, `kube-public`, and `kube-node-lease`; `portainer` is a Portainer installation namespace, not a built-in Kubernetes system namespace. Updated the list to include `kube-node-lease` and clarify that `portainer` applies when Portainer is installed in its default namespace.

2. **Vague Portainer toggle location**: The post described the **Show system resources** control as a checkbox or toggle at the top of the list. Portainer documentation describes this as a table settings option opened from the three-dot menu. Updated the steps to use the table settings menu and to mention relevant resource lists such as **ConfigMaps & Secrets** and **Networking > Services**.

3. **Over-broad visibility claims**: The post implied all system namespaces, pods, ConfigMaps, and Secrets appear in the same place. Updated the wording to distinguish namespace filters/lists, application workload visibility, and the **ConfigMaps & Secrets** page, and noted that visibility depends on deployment and account access.

4. **Deprecated Kubernetes command**: The post used `kubectl get componentstatuses`, but the `ComponentStatus` API is deprecated in Kubernetes v1.19+. Replaced it with `kubectl get --raw='/readyz?verbose'`, which aligns with the current Kubernetes API health endpoint guidance.

5. **Non-canonical kubectl top syntax**: The post used `kubectl top pods`. The official generated kubectl reference documents `kubectl top pod`. Updated the command to the canonical form.

## Review Notes
- Remaining kubectl examples are syntactically valid and align with official Kubernetes documentation.
- Some examples are cluster-dependent: `kubectl top pod` requires the resource metrics API, and kube-proxy, metrics-server, or CNI components may be absent or installed in different namespaces depending on the Kubernetes distribution.
- `kubectl` was not available in the local environment, so command validation was performed against official Kubernetes command references and documentation.
