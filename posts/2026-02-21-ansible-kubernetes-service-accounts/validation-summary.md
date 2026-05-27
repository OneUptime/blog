# Validation Summary: How to Use Ansible to Manage Kubernetes Service Accounts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible `kubernetes.core` collection
- Kubernetes ServiceAccounts
- Kubernetes RBAC Roles and RoleBindings
- Kubernetes imagePullSecrets
- Kubernetes ServiceAccount tokens

## Sources Consulted
- Ansible `kubernetes.core.k8s` module docs: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible `kubernetes.core` collection runtime metadata: https://github.com/ansible-collections/kubernetes.core/blob/main/meta/runtime.yml
- Kubernetes Service Accounts concept docs: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Configure Service Accounts for Pods docs: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes RBAC authorization docs: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ServiceAccount administration docs: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/

## Issues Found
- The prerequisites listed Ansible 2.12+, but the current `kubernetes.core` collection requires ansible-core 2.16 or newer. Updated the prerequisite to Ansible 2.16+.
- The token-mounting section stated that pods using a ServiceAccount with `automountServiceAccountToken: false` will not have a token mounted in all cases. Updated the wording to mention that the pod spec can override the ServiceAccount setting.
- The token-mounting security explanation said a compromised pod cannot interact with the Kubernetes API. Updated it to clarify that the pod cannot use an automatically mounted ServiceAccount token, since other credentials or access paths could still exist.
- The long-lived token section recommended creating a Secret for external use without noting the current Kubernetes recommendation for short-lived TokenRequest tokens. Added a sentence recommending TokenRequest for most external use cases and scoped the Secret example to long-lived tokens.

## Review Notes
All YAML snippets parse successfully. The examples use current Kubernetes API versions and valid ServiceAccount, Secret, Deployment, Role, and RoleBinding fields. The explicit long-lived token Secret pattern remains supported, but Kubernetes recommends short-lived TokenRequest tokens where practical.
