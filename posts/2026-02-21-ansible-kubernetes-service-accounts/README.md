# How to Use Ansible to Manage Kubernetes Service Accounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Service Accounts, Security, RBAC

Description: Create and manage Kubernetes Service Accounts with Ansible for pod identity, RBAC integration, and workload authentication.

---

Every pod in Kubernetes runs under a Service Account. If you do not specify one, pods use the `default` Service Account in their namespace, which typically has no permissions beyond basic API access. For production workloads, creating dedicated Service Accounts with specific RBAC permissions is a security best practice. It ensures each application has exactly the access it needs and nothing more.

Managing Service Accounts through Ansible lets you define pod identities alongside the rest of your infrastructure. This guide covers creating Service Accounts, binding them to Roles, attaching image pull secrets, and configuring workloads to use specific accounts.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A valid kubeconfig
- Python `kubernetes` library

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Creating a Basic Service Account

A Service Account on its own is just an identity. Its permissions come from RoleBindings and ClusterRoleBindings.

```yaml
# playbook: create-service-account.yml
# Creates a Service Account for an application workload
---
- name: Create Kubernetes Service Account
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create service account for the web application
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ServiceAccount
          metadata:
            name: web-app
            namespace: production
            labels:
              app: web-app
              managed-by: ansible
```

## Service Account with Image Pull Secrets

If your pods pull images from a private registry, the Service Account can automatically provide the pull credentials.

```yaml
# playbook: create-sa-with-pull-secret.yml
# Creates a Service Account with image pull secret attached
---
- name: Create Service Account with pull secret
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production
    sa_name: app-runner
    registry_secret: registry-credentials

  tasks:
    - name: Create the registry pull secret
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: "{{ registry_secret }}"
            namespace: "{{ namespace }}"
          type: kubernetes.io/dockerconfigjson
          data:
            .dockerconfigjson: "{{ lookup('file', 'docker-config.json') | b64encode }}"

    - name: Create service account with pull secret
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ServiceAccount
          metadata:
            name: "{{ sa_name }}"
            namespace: "{{ namespace }}"
          imagePullSecrets:
            - name: "{{ registry_secret }}"
```

Any pod using this Service Account will automatically use the `registry-credentials` secret to pull container images. You do not need to specify `imagePullSecrets` in each pod spec.

## Complete Service Account Setup with RBAC

In practice, creating a Service Account means also creating the Role and RoleBinding that give it permissions.

```yaml
# playbook: create-sa-full.yml
# Creates a Service Account with Role and RoleBinding for a CI/CD pipeline
---
- name: Create complete Service Account setup
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production
    sa_name: deploy-agent
    role_name: deploy-agent-role

  tasks:
    - name: Create the service account
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ServiceAccount
          metadata:
            name: "{{ sa_name }}"
            namespace: "{{ namespace }}"
            labels:
              purpose: ci-cd
              managed-by: ansible

    - name: Create the role with deployment permissions
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: rbac.authorization.k8s.io/v1
          kind: Role
          metadata:
            name: "{{ role_name }}"
            namespace: "{{ namespace }}"
          rules:
            - apiGroups: ["apps"]
              resources: ["deployments"]
              verbs: ["get", "list", "watch", "create", "update", "patch"]
            - apiGroups: [""]
              resources: ["services", "configmaps"]
              verbs: ["get", "list", "watch", "create", "update", "patch"]
            - apiGroups: [""]
              resources: ["pods", "pods/log"]
              verbs: ["get", "list", "watch"]

    - name: Bind the role to the service account
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: rbac.authorization.k8s.io/v1
          kind: RoleBinding
          metadata:
            name: "{{ sa_name }}-binding"
            namespace: "{{ namespace }}"
          subjects:
            - kind: ServiceAccount
              name: "{{ sa_name }}"
              namespace: "{{ namespace }}"
          roleRef:
            kind: Role
            name: "{{ role_name }}"
            apiGroup: rbac.authorization.k8s.io
```

## Creating Service Accounts for Multiple Applications

Use a data structure to create Service Accounts and their RBAC bindings for several applications.

```yaml
# playbook: create-sa-multi.yml
# Creates Service Accounts for multiple applications with different permissions
---
- name: Create Service Accounts for all applications
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production
    applications:
      - name: web-frontend
        needs_secrets: false
        api_groups: [""]
        resources: ["configmaps"]
        verbs: ["get", "list", "watch"]
      - name: api-server
        needs_secrets: true
        api_groups: [""]
        resources: ["configmaps", "secrets"]
        verbs: ["get", "list", "watch"]
      - name: batch-worker
        needs_secrets: false
        api_groups: ["batch"]
        resources: ["jobs"]
        verbs: ["get", "list", "watch", "create"]

  tasks:
    - name: Create service account for each application
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ServiceAccount
          metadata:
            name: "{{ item.name }}-sa"
            namespace: "{{ namespace }}"
            labels:
              app: "{{ item.name }}"
      loop: "{{ applications }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Create role for each application
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: rbac.authorization.k8s.io/v1
          kind: Role
          metadata:
            name: "{{ item.name }}-role"
            namespace: "{{ namespace }}"
          rules:
            - apiGroups: "{{ item.api_groups }}"
              resources: "{{ item.resources }}"
              verbs: "{{ item.verbs }}"
      loop: "{{ applications }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Bind role to service account
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: rbac.authorization.k8s.io/v1
          kind: RoleBinding
          metadata:
            name: "{{ item.name }}-binding"
            namespace: "{{ namespace }}"
          subjects:
            - kind: ServiceAccount
              name: "{{ item.name }}-sa"
              namespace: "{{ namespace }}"
          roleRef:
            kind: Role
            name: "{{ item.name }}-role"
            apiGroup: rbac.authorization.k8s.io
      loop: "{{ applications }}"
      loop_control:
        label: "{{ item.name }}"
```

## Using Service Accounts in Deployments

Assign the Service Account to your pods through the Deployment spec.

```yaml
# task: deploy with a specific service account
- name: Deploy application with dedicated service account
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: api-server
        namespace: production
      spec:
        replicas: 3
        selector:
          matchLabels:
            app: api-server
        template:
          metadata:
            labels:
              app: api-server
          spec:
            serviceAccountName: api-server-sa
            automountServiceAccountToken: true
            containers:
              - name: api-server
                image: myapp/api-server:v2.0
                ports:
                  - containerPort: 8080
```

The `serviceAccountName` tells Kubernetes which Service Account to use. The `automountServiceAccountToken: true` mounts the token inside the pod so the application can authenticate with the Kubernetes API. Set this to `false` if your application does not need API access.

## Disabling Automatic Token Mounting

For pods that do not need to talk to the Kubernetes API, disable token mounting to reduce the attack surface.

```yaml
# task: create a service account with token mounting disabled
- name: Create restricted service account
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: web-only
        namespace: production
      automountServiceAccountToken: false
```

With this setting, pods using the `web-only` Service Account will not have a Kubernetes API token mounted. If someone compromises the pod, they cannot use it to interact with the Kubernetes API.

## Creating Long-Lived Tokens (Kubernetes 1.24+)

Since Kubernetes 1.24, Service Account tokens are no longer automatically created as Secrets. To generate a token for external use (like CI/CD systems), create a Secret explicitly.

```yaml
# task: create a long-lived token for external access
- name: Create a token secret for the CI/CD service account
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: Secret
      metadata:
        name: deploy-agent-token
        namespace: production
        annotations:
          kubernetes.io/service-account.name: deploy-agent
      type: kubernetes.io/service-account-token
```

Kubernetes will automatically populate the `data.token` field with a JWT token that the `deploy-agent` Service Account can use.

## Auditing Service Accounts

Review which Service Accounts exist and what permissions they have.

```yaml
# task: audit service accounts in a namespace
- name: Get all service accounts
  kubernetes.core.k8s_info:
    kind: ServiceAccount
    namespace: production
  register: sa_list

- name: Display service accounts
  ansible.builtin.debug:
    msg: "SA: {{ item.metadata.name }} | Secrets: {{ item.secrets | default([]) | length }} | Pull Secrets: {{ item.imagePullSecrets | default([]) | map(attribute='name') | list }}"
  loop: "{{ sa_list.resources }}"
  loop_control:
    label: "{{ item.metadata.name }}"
```

## Summary

Service Accounts are the identity layer for Kubernetes workloads. Every pod should run under a dedicated Service Account with precisely the permissions it needs. Managing them through Ansible ensures consistency, enables code review of access policies, and makes it easy to onboard new applications with the right RBAC configuration. Remember to disable token mounting for pods that do not need API access, use image pull secrets on the Service Account rather than individual pod specs, and audit your accounts regularly for permission drift.
