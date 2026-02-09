# How to Use Kyverno Generate Policies to Auto-Create Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kyverno, Automation, Resource Generation, DevOps

Description: Learn how to use Kyverno generate policies to automatically create supporting resources like ConfigMaps, Secrets, NetworkPolicies, and RBAC when new namespaces or applications are deployed, reducing manual overhead.

---

Kyverno generate policies create new resources automatically in response to trigger events, such as namespace creation or application deployment. This automation reduces manual work, ensures consistency, and prevents configuration drift. Generate policies are particularly useful for setting up namespace defaults, RBAC, network policies, and supporting resources that every application needs.

## Understanding Generate Policies

Generate policies watch for trigger resources and create target resources when matches occur. The most common pattern creates resources when new namespaces are created, but you can trigger on any resource type. Unlike mutate policies that modify existing resources, generate policies create entirely new ones.

Generated resources are owned by the source resource, so deleting the trigger resource also deletes generated resources. Kyverno tracks ownership through labels and ensures generated resources stay synchronized with policy changes.

## Creating Default NetworkPolicies for New Namespaces

Start with a policy that creates a default deny-all NetworkPolicy when namespaces are created:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-networkpolicy
  annotations:
    policies.kyverno.io/title: Add Network Policy
    policies.kyverno.io/category: Multi-Tenancy
    policies.kyverno.io/description: >-
      Create a default deny-all NetworkPolicy in new namespaces.
spec:
  rules:
    - name: default-deny-all
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kube-public
                - kyverno
      generate:
        synchronize: true
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        name: default-deny-all
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            podSelector: {}
            policyTypes:
              - Ingress
              - Egress
```

The `synchronize: true` setting means Kyverno updates the NetworkPolicy if the policy definition changes. The namespace is set to the name of the newly created namespace using `{{request.object.metadata.name}}`.

Test it by creating a namespace:

```bash
kubectl create namespace test-app
kubectl get networkpolicy -n test-app
```

You should see the default-deny-all NetworkPolicy automatically created.

## Generating Resource Quotas

Prevent resource exhaustion by automatically creating ResourceQuotas for new namespaces:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-resourcequota
  annotations:
    policies.kyverno.io/title: Add Resource Quota
    policies.kyverno.io/category: Multi-Tenancy
spec:
  rules:
    - name: generate-resourcequota
      match:
        any:
          - resources:
              kinds:
                - Namespace
              selector:
                matchLabels:
                  environment: production
      generate:
        synchronize: true
        apiVersion: v1
        kind: ResourceQuota
        name: production-quota
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            hard:
              requests.cpu: "10"
              requests.memory: "20Gi"
              limits.cpu: "20"
              limits.memory: "40Gi"
              pods: "50"
              services: "10"
              persistentvolumeclaims: "20"
```

This policy only applies to namespaces labeled with `environment: production`, preventing quota application to development namespaces.

## Creating Default RBAC for Developers

Set up developer access automatically when namespaces are created:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-developer-role
  annotations:
    policies.kyverno.io/title: Add Developer Role
    policies.kyverno.io/category: RBAC
spec:
  rules:
    - name: generate-developer-rolebinding
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kube-public
                - kyverno
      generate:
        synchronize: true
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        name: developers
        namespace: "{{request.object.metadata.name}}"
        data:
          roleRef:
            apiGroup: rbac.authorization.k8s.io
            kind: ClusterRole
            name: edit
          subjects:
            - apiGroup: rbac.authorization.k8s.io
              kind: Group
              name: developers
```

This creates a RoleBinding that grants the edit ClusterRole to the developers group in every new namespace, giving developers immediate access.

## Generating ConfigMaps from Templates

Create default configuration for applications by generating ConfigMaps:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-app-config
  annotations:
    policies.kyverno.io/title: Generate App Config
    policies.kyverno.io/category: Other
spec:
  rules:
    - name: create-default-config
      match:
        any:
          - resources:
              kinds:
                - Namespace
      context:
        - name: envconfig
          configMap:
            name: environment-defaults
            namespace: kyverno
      generate:
        synchronize: true
        apiVersion: v1
        kind: ConfigMap
        name: app-config
        namespace: "{{request.object.metadata.name}}"
        data:
          data:
            log_level: "{{ envconfig.data.defaultLogLevel }}"
            api_endpoint: "{{ envconfig.data.apiEndpoint }}"
            region: "{{ envconfig.data.region }}"
            max_connections: "100"
```

The context block loads environment defaults from a ConfigMap in the kyverno namespace. These values populate the generated ConfigMap in each new namespace.

## Cloning Resources Across Namespaces

Clone existing resources into new namespaces, useful for Secrets or common ConfigMaps:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: clone-registry-secret
  annotations:
    policies.kyverno.io/title: Clone Registry Secret
    policies.kyverno.io/category: Other
spec:
  rules:
    - name: sync-registry-secret
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        synchronize: true
        apiVersion: v1
        kind: Secret
        name: registry-credentials
        namespace: "{{request.object.metadata.name}}"
        clone:
          namespace: default
          name: registry-credentials
```

This policy clones the registry-credentials Secret from the default namespace into every new namespace, enabling image pulls without manual secret distribution.

## Generating LimitRanges

Set default resource limits for containers by generating LimitRanges:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-limitrange
  annotations:
    policies.kyverno.io/title: Add Limit Range
    policies.kyverno.io/category: Multi-Tenancy
spec:
  rules:
    - name: generate-limitrange
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        synchronize: true
        apiVersion: v1
        kind: LimitRange
        name: default-limits
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            limits:
              - type: Container
                default:
                  cpu: "500m"
                  memory: "512Mi"
                defaultRequest:
                  cpu: "100m"
                  memory: "128Mi"
                max:
                  cpu: "2"
                  memory: "2Gi"
              - type: Pod
                max:
                  cpu: "4"
                  memory: "4Gi"
```

These limits prevent individual containers or pods from consuming excessive resources, protecting the cluster from resource exhaustion.

## Creating PodDisruptionBudgets

Generate PodDisruptionBudgets based on Deployment labels to ensure high availability:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-pdb
  annotations:
    policies.kyverno.io/title: Generate PodDisruptionBudget
    policies.kyverno.io/category: Other
spec:
  rules:
    - name: create-pdb-for-deployments
      match:
        any:
          - resources:
              kinds:
                - Deployment
              selector:
                matchLabels:
                  ha: required
      preconditions:
        all:
          - key: "{{request.object.spec.replicas}}"
            operator: GreaterThanOrEquals
            value: 3
      generate:
        synchronize: true
        apiVersion: policy/v1
        kind: PodDisruptionBudget
        name: "{{request.object.metadata.name}}-pdb"
        namespace: "{{request.object.metadata.namespace}}"
        data:
          spec:
            minAvailable: 1
            selector:
              matchLabels:
                app: "{{request.object.metadata.labels.app}}"
```

This policy creates PDBs for Deployments labeled with `ha: required` that have at least 3 replicas, ensuring some pods remain available during disruptions.

## Generating ServiceAccounts with Secrets

Create ServiceAccounts with associated image pull secrets:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-serviceaccount
  annotations:
    policies.kyverno.io/title: Generate ServiceAccount
    policies.kyverno.io/category: Other
spec:
  rules:
    - name: create-serviceaccount
      match:
        any:
          - resources:
              kinds:
                - Namespace
              selector:
                matchLabels:
                  app-team: backend
      generate:
        synchronize: true
        apiVersion: v1
        kind: ServiceAccount
        name: backend-sa
        namespace: "{{request.object.metadata.name}}"
        data:
          imagePullSecrets:
            - name: registry-credentials
          automountServiceAccountToken: false
```

This ServiceAccount references the registry-credentials secret, enabling pods using this ServiceAccount to pull private images.

## Conditional Generation Based on Labels

Use preconditions to control when resources are generated:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: conditional-generation
  annotations:
    policies.kyverno.io/title: Conditional Generation
    policies.kyverno.io/category: Other
spec:
  rules:
    - name: generate-if-labeled
      match:
        any:
          - resources:
              kinds:
                - Namespace
      preconditions:
        all:
          - key: "{{request.object.metadata.labels.monitoring}}"
            operator: Equals
            value: enabled
      generate:
        synchronize: true
        apiVersion: v1
        kind: ServiceMonitor
        name: namespace-monitor
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            selector:
              matchLabels:
                monitoring: enabled
            endpoints:
              - port: metrics
                interval: 30s
```

Resources are only generated when the namespace has the `monitoring: enabled` label, giving teams control over monitoring setup.

## Generating Multiple Resources with One Policy

Create multiple related resources from a single trigger:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: namespace-setup-bundle
  annotations:
    policies.kyverno.io/title: Namespace Setup Bundle
    policies.kyverno.io/category: Multi-Tenancy
spec:
  rules:
    - name: generate-networkpolicy
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        synchronize: true
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        name: default-deny
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            podSelector: {}
            policyTypes: [Ingress, Egress]

    - name: generate-limitrange
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        synchronize: true
        apiVersion: v1
        kind: LimitRange
        name: limits
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            limits:
              - type: Container
                default: {cpu: 500m, memory: 512Mi}
                defaultRequest: {cpu: 100m, memory: 128Mi}

    - name: generate-resourcequota
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        synchronize: true
        apiVersion: v1
        kind: ResourceQuota
        name: quota
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            hard:
              pods: "50"
              requests.cpu: "10"
              requests.memory: "20Gi"
```

This bundle policy creates three resources for every new namespace, providing complete namespace initialization in one policy.

## Monitoring Generated Resources

Check which resources Kyverno has generated:

```bash
# List all generated resources
kubectl get clusterpolicy -o yaml | grep -A 10 generate

# Check for generate rules in policy reports
kubectl get policyreport -A

# View generated resources in a namespace
kubectl get all,networkpolicy,limitrange,resourcequota -n test-app
```

Generated resources have the label `generate.kyverno.io/policy-name` that identifies their source policy.

## Conclusion

Kyverno generate policies automate resource creation, reducing manual work and ensuring consistency across namespaces. Start with namespace-triggered policies for NetworkPolicies, ResourceQuotas, and RBAC. Use the synchronize flag to keep generated resources updated when policies change. Clone secrets and ConfigMaps across namespaces to distribute common configuration. Combine multiple generate rules in bundle policies for complete namespace initialization.

Generate policies create self-service infrastructure where developers can create namespaces and immediately get all necessary supporting resources without manual intervention or tickets to operations teams.
