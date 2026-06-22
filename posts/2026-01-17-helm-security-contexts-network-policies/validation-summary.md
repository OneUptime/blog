# Validation Summary: Securing Helm Charts with Security Contexts and Network Policies

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Helm charts and Go template functions
- Kubernetes Deployments
- Kubernetes Pod and container security contexts
- Kubernetes Pod Security Standards and Pod Security Admission
- Kubernetes NetworkPolicy
- Kubernetes RBAC, ServiceAccounts, Roles, and RoleBindings
- Kubernetes Secrets
- Container image references and image pull settings

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes documentation: Using sysctls in a Kubernetes Cluster - https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/
- Kubernetes documentation: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes documentation: Pod Security Admission - https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Helm documentation: Template Function List - https://helm.sh/docs/chart_template_guide/function_list/
- Helm documentation: Variables - https://helm.sh/docs/chart_template_guide/variables/
- Helm documentation: Chart Development Tips and Tricks - https://helm.sh/docs/howto/charts_tips_and_tricks/

## Issues Found
- The pod security context example described `sysctls` as requiring privileged mode. Kubernetes supports namespaced sysctls in pod `securityContext`; unsafe sysctls require cluster administrator enablement rather than simply a privileged container. Updated the comment to reflect the official sysctl model.
- The Pod Security Admission namespace labels set `warn: restricted`, but the comment said "Warn on baseline violations." Updated the comment to "Warn on restricted profile violations" so it matches the actual label value.
- The NetworkPolicy overview said policies control only pod-to-pod communication, but the example also covers egress to IP blocks. Updated the sentence to include pod-to-external communication.
- The DNS egress NetworkPolicy used `namespaceSelector: {}` with a `k8s-app: kube-dns` pod selector, which can match DNS-labeled pods in any namespace. Tightened the example to the `kube-system` namespace using the standard `kubernetes.io/metadata.name` namespace label.
- The external HTTPS rule used `0.0.0.0/0`, which technically includes private and cluster-adjacent IP ranges as well as internet destinations. Updated the comment from "Allow external HTTPS" to "Allow HTTPS destinations" to accurately describe the rule.

## Review Notes
The remaining examples use current Kubernetes APIs and Helm template patterns. Some snippets are intentionally partial chart fragments, so they depend on standard helper templates and values being present in the chart. The secret examples are technically valid Kubernetes Secrets, but production charts should still prefer externally managed secrets or a secret operator to avoid storing sensitive values in Helm release history.
