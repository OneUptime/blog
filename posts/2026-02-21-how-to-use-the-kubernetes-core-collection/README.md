# How to Use the kubernetes.core Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, DevOps, Container Orchestration

Description: Deploy and manage Kubernetes resources with Ansible using the kubernetes.core collection for pods, deployments, services, and cluster operations.

---

If your team already uses Ansible for infrastructure automation and you need to manage Kubernetes clusters, the `kubernetes.core` collection is the bridge between the two worlds. Rather than learning a completely separate tool for Kubernetes operations, you can manage deployments, services, config maps, secrets, and pretty much any Kubernetes resource type directly from Ansible playbooks.

## Installing the Collection

The collection requires the `kubernetes` Python client library.

```bash
# Install the collection
ansible-galaxy collection install kubernetes.core

# Install Python dependencies
pip install kubernetes PyYAML jsonpatch
```

## Authentication

The collection uses the same kubeconfig that `kubectl` does. It picks up the `~/.kube/config` file automatically, or you can specify a different one.

```yaml
# playbook-auth-options.yml - different ways to authenticate
- hosts: localhost
  tasks:
    # Option 1: Use default kubeconfig
    - name: Get cluster info using default kubeconfig
      kubernetes.core.k8s_cluster_info:
      register: cluster_info

    # Option 2: Specify a kubeconfig file
    - name: Get pods using specific kubeconfig
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: default
        kubeconfig: "/path/to/custom-kubeconfig"

    # Option 3: Use inline connection parameters
    - name: Connect with explicit credentials
      kubernetes.core.k8s_info:
        kind: Namespace
        host: "https://k8s-api.example.com:6443"
        api_key: "{{ vault_k8s_api_token }}"
        validate_certs: true
```

## Creating Namespaces

Start by setting up namespaces for your applications.

```yaml
# playbook-namespaces.yml - create application namespaces with resource quotas
- hosts: localhost
  tasks:
    - name: Create application namespaces
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ item.name }}"
            labels:
              team: "{{ item.team }}"
              environment: "{{ item.env }}"
      loop:
        - { name: "myapp-prod", team: "backend", env: "production" }
        - { name: "myapp-staging", team: "backend", env: "staging" }
        - { name: "monitoring", team: "sre", env: "production" }

    - name: Set resource quotas on namespaces
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ResourceQuota
          metadata:
            name: default-quota
            namespace: "{{ item.namespace }}"
          spec:
            hard:
              requests.cpu: "{{ item.cpu }}"
              requests.memory: "{{ item.memory }}"
              pods: "{{ item.max_pods }}"
      loop:
        - { namespace: "myapp-prod", cpu: "8", memory: "16Gi", max_pods: "50" }
        - { namespace: "myapp-staging", cpu: "4", memory: "8Gi", max_pods: "30" }
```

## Deploying Applications

The `k8s` module handles any Kubernetes resource. Here is a complete application deployment.

```yaml
# playbook-deploy-app.yml - deploy a complete application stack
- hosts: localhost
  vars:
    app_name: myapp
    app_namespace: myapp-prod
    app_image: "registry.example.com/myapp:v1.2.3"
    app_replicas: 3
  tasks:
    - name: Create ConfigMap for application settings
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: "{{ app_name }}-config"
            namespace: "{{ app_namespace }}"
          data:
            APP_ENV: "production"
            LOG_LEVEL: "info"
            DB_HOST: "postgres.myapp-prod.svc.cluster.local"
            DB_PORT: "5432"
            CACHE_HOST: "redis.myapp-prod.svc.cluster.local"

    - name: Create Secret for sensitive configuration
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: "{{ app_name }}-secrets"
            namespace: "{{ app_namespace }}"
          type: Opaque
          stringData:
            DB_PASSWORD: "{{ vault_db_password }}"
            API_KEY: "{{ vault_api_key }}"
            JWT_SECRET: "{{ vault_jwt_secret }}"

    - name: Deploy the application
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ app_namespace }}"
            labels:
              app: "{{ app_name }}"
          spec:
            replicas: "{{ app_replicas }}"
            selector:
              matchLabels:
                app: "{{ app_name }}"
            strategy:
              type: RollingUpdate
              rollingUpdate:
                maxSurge: 1
                maxUnavailable: 0
            template:
              metadata:
                labels:
                  app: "{{ app_name }}"
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "{{ app_image }}"
                    ports:
                      - containerPort: 8080
                    envFrom:
                      - configMapRef:
                          name: "{{ app_name }}-config"
                      - secretRef:
                          name: "{{ app_name }}-secrets"
                    resources:
                      requests:
                        cpu: "250m"
                        memory: "256Mi"
                      limits:
                        cpu: "1000m"
                        memory: "512Mi"
                    readinessProbe:
                      httpGet:
                        path: /health
                        port: 8080
                      initialDelaySeconds: 10
                      periodSeconds: 5
                    livenessProbe:
                      httpGet:
                        path: /health
                        port: 8080
                      initialDelaySeconds: 30
                      periodSeconds: 10

    - name: Create Service for the application
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ app_namespace }}"
          spec:
            selector:
              app: "{{ app_name }}"
            ports:
              - port: 80
                targetPort: 8080
                protocol: TCP
            type: ClusterIP

    - name: Create Ingress for external access
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: "{{ app_name }}-ingress"
            namespace: "{{ app_namespace }}"
            annotations:
              nginx.ingress.kubernetes.io/ssl-redirect: "true"
              cert-manager.io/cluster-issuer: "letsencrypt-prod"
          spec:
            tls:
              - hosts:
                  - "myapp.example.com"
                secretName: myapp-tls
            rules:
              - host: "myapp.example.com"
                http:
                  paths:
                    - path: /
                      pathType: Prefix
                      backend:
                        service:
                          name: "{{ app_name }}"
                          port:
                            number: 80
```

## Applying Manifests from Files

You can also apply YAML manifests from files, similar to `kubectl apply -f`.

```yaml
# playbook-apply-manifests.yml - apply manifests from files
- hosts: localhost
  tasks:
    - name: Apply all manifests from a directory
      kubernetes.core.k8s:
        state: present
        src: "{{ item }}"
      with_fileglob:
        - "manifests/*.yml"

    - name: Apply a manifest from a URL
      kubernetes.core.k8s:
        state: present
        src: "https://raw.githubusercontent.com/example/repo/main/deploy.yml"
```

## Querying Cluster State

The `k8s_info` module lets you query the cluster for existing resources.

```yaml
# playbook-query.yml - check deployment status and pod health
- hosts: localhost
  tasks:
    - name: Get all pods in a namespace
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: myapp-prod
        label_selectors:
          - app=myapp
      register: pod_list

    - name: Display pod status
      ansible.builtin.debug:
        msg: "Pod {{ item.metadata.name }} is {{ item.status.phase }}"
      loop: "{{ pod_list.resources }}"

    - name: Check deployment rollout status
      kubernetes.core.k8s_info:
        kind: Deployment
        name: myapp
        namespace: myapp-prod
      register: deployment
      until: >
        deployment.resources[0].status.readyReplicas is defined and
        deployment.resources[0].status.readyReplicas == deployment.resources[0].spec.replicas
      retries: 30
      delay: 10
```

## Executing Commands in Pods

The `k8s_exec` module runs commands inside running pods, like `kubectl exec`.

```yaml
# playbook-exec.yml - run commands inside pods
- hosts: localhost
  tasks:
    - name: Run database migration
      kubernetes.core.k8s_exec:
        namespace: myapp-prod
        pod: "{{ pod_list.resources[0].metadata.name }}"
        command: "python manage.py migrate --noinput"
      register: migration_result

    - name: Show migration output
      ansible.builtin.debug:
        msg: "{{ migration_result.stdout_lines }}"
```

## Rolling Back Deployments

Handle rollbacks when deployments go wrong.

```yaml
# playbook-rollback.yml - rollback a bad deployment
- hosts: localhost
  tasks:
    - name: Scale down the broken deployment
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: myapp
            namespace: myapp-prod
          spec:
            replicas: 0

    - name: Redeploy with the previous known-good image
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: myapp
            namespace: myapp-prod
          spec:
            replicas: 3
            template:
              spec:
                containers:
                  - name: myapp
                    image: "registry.example.com/myapp:v1.2.2"
```

## Practical Tips

After using this collection for Kubernetes management on multiple clusters, here is what stands out:

1. **Use `wait` and `wait_condition` parameters.** The `k8s` module can wait for resources to reach a desired state before moving on, which prevents race conditions in deployment pipelines.

2. **Combine with Helm.** The collection includes a `helm` module for deploying Helm charts. Use it for third-party applications and the `k8s` module for your own.

3. **Template your manifests.** Jinja2 templating on Kubernetes YAML lets you reuse the same definitions across environments with different parameters.

4. **Use `k8s_info` for validation.** After deploying, query the cluster to confirm resources are in the expected state rather than assuming the apply worked.

5. **Keep secrets in Ansible Vault.** Do not store Kubernetes secrets in plain YAML files. Use Ansible Vault to encrypt sensitive values and inject them at deploy time.

The `kubernetes.core` collection is a natural fit for teams that already use Ansible and want to manage Kubernetes without adding another tool to the stack.
