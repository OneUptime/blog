# Validation Summary: How to Toggle System Resource Visibility in Portainer for Kubernetes

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Kubernetes namespaces
- Kubernetes RBAC
- `kubectl`

## Sources Consulted
- Portainer Applications documentation: https://docs.portainer.io/user/kubernetes/applications
- Portainer ConfigMaps & Secrets documentation: https://docs.portainer.io/user/kubernetes/configurations
- Portainer Services documentation: https://docs.portainer.io/user/kubernetes/networking/services
- Portainer Manage a namespace documentation: https://docs.portainer.io/user/kubernetes/namespaces/manage
- Portainer Manage access to a namespace documentation: https://docs.portainer.io/user/kubernetes/namespaces/access
- Portainer Kubernetes roles and bindings documentation: https://docs.portainer.io/advanced/kubernetes-roles-and-bindings
- Portainer Agent on Kubernetes installation documentation: https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer Server on Kubernetes installation documentation: https://docs.portainer.io/start/install/server/kubernetes/baremetal
- Kubernetes namespace documentation: https://kubernetes.io/docs/tasks/administer-cluster/namespaces/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes `kubectl` quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
1. **Undocumented Portainer toggle workflow.** The post originally described a namespace-dropdown toggle named **Show system namespaces** and a `Settings -> Kubernetes -> System resource visibility` option. I could not verify either in Portainer's official docs. I replaced this with Portainer's documented per-view **Show system resources** toggle in the table settings menu and the documented **Mark as system** namespace action.
2. **Overstated Kubernetes namespace classification.** The post called `portainer`, `ingress-nginx`, `cert-manager`, and `monitoring` reserved Kubernetes system namespaces. Official Kubernetes docs only identify the built-in initial namespaces such as `kube-system`, `kube-public`, and `kube-node-lease`. I revised the wording so the post distinguishes built-in system namespaces from additional infrastructure namespaces that Portainer can treat as system namespaces.
3. **Deprecated event sorting field.** The post used `kubectl get events --sort-by='.lastTimestamp'`. Current Kubernetes deprecation guidance marks `lastTimestamp` deprecated for `events.k8s.io/v1`, and the current quick reference uses `.metadata.creationTimestamp`. I updated both event-sorting commands accordingly.
4. **Outdated warning-events command.** The post used `kubectl get events -n kube-system --field-selector type=Warning`. Current Kubernetes documentation provides `kubectl events --types=Warning` as the supported command pattern. I updated the warning-events example to match the current CLI reference.
5. **RBAC claims were too absolute.** The original text claimed non-admin users would never see system namespaces regardless of toggle settings. Portainer's RBAC documentation is more specific: namespace-scoped roles depend on assigned namespaces, while roles like Operator and Helpdesk apply to all non-system namespaces. I rewrote this section to match Portainer's documented namespace access and role-scope behavior.
6. **Portainer namespace description was incomplete.** The post said the `portainer` namespace contains only the Portainer agent. Portainer's Kubernetes installation docs describe Portainer Server and Agent deployments in Kubernetes, and the server installation docs also reference the `portainer` deployment directly. I updated the text to refer to Portainer components and changed the log commands to deployment-based forms that match the documented deployment names.
7. **Health-check command had incorrect expected output.** The post said `kubectl get pods -n kube-system | grep -v Running` should return no results on a healthy cluster, but that command also returns the header row. I replaced it with a safer status-review command and wording.

## Review Notes
- The `kubectl logs` label-selector examples are syntactically valid and match current `kubectl logs` behavior, but actual labels and component names can still vary by distribution.
- Access to `kube-apiserver` pod logs is generally limited to self-managed control plane deployments; managed Kubernetes services often do not expose those control plane pods in `kube-system`.
- The post does not pin a Portainer release, so the review was done against the current Portainer documentation available on April 24, 2026.
