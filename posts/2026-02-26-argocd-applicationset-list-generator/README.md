# How to Use List Generator in ApplicationSets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSet

Description: Complete guide to using the ArgoCD ApplicationSet List generator with static and dynamic elements, multi-cluster deployments, and advanced templating patterns.

---

The List generator is the simplest and most explicit way to drive ApplicationSet template rendering. You provide a literal list of key-value pairs, and ApplicationSet creates one Application per entry. While other generators discover parameters dynamically from Git repos or cluster registries, the List generator gives you full control over exactly what gets deployed and where.

This guide covers everything from basic usage to advanced patterns including element merging, conditional values, and integration with other generators.

## Basic List Generator Usage

At its core, the List generator takes an array of elements. Each element is a map of string key-value pairs that become template variables.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-apps
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - appName: user-service
        repoPath: services/user
        port: "8080"
      - appName: order-service
        repoPath: services/order
        port: "8081"
      - appName: payment-service
        repoPath: services/payment
        port: "8082"
  template:
    metadata:
      name: '{{appName}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform
        targetRevision: main
        path: '{{repoPath}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{appName}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

Apply and verify.

```bash
# Deploy the ApplicationSet
kubectl apply -f team-apps.yaml

# Verify three Applications are created
kubectl get applications -n argocd
# NAME              SYNC STATUS   HEALTH STATUS
# user-service      Synced        Healthy
# order-service     Synced        Healthy
# payment-service   Synced        Healthy
```

## Multi-Cluster Deployment with List Generator

A common use case is deploying the same application to multiple clusters. The List generator lets you define cluster-specific parameters explicitly.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: frontend-multi-cluster
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: dev
        url: https://dev-cluster.example.com
        replicas: "1"
        ingress: dev.app.example.com
      - cluster: staging
        url: https://staging-cluster.example.com
        replicas: "2"
        ingress: staging.app.example.com
      - cluster: production
        url: https://prod-cluster.example.com
        replicas: "5"
        ingress: app.example.com
  template:
    metadata:
      name: 'frontend-{{cluster}}'
      labels:
        environment: '{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/frontend
        targetRevision: main
        path: deploy/overlays/{{cluster}}
        helm:
          parameters:
          - name: replicaCount
            value: '{{replicas}}'
          - name: ingress.host
            value: '{{ingress}}'
      destination:
        server: '{{url}}'
        namespace: frontend
```

Each element maps directly to a cluster, and the template uses the cluster-specific values for configuration.

## Using List Generator with Helm Values

When your applications use Helm charts, the List generator parameters can drive Helm value overrides.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - name: api
        chart: api-gateway
        version: "2.1.0"
        memory: "512Mi"
        cpu: "250m"
      - name: worker
        chart: background-worker
        version: "1.5.3"
        memory: "1Gi"
        cpu: "500m"
      - name: scheduler
        chart: cron-scheduler
        version: "1.0.7"
        memory: "256Mi"
        cpu: "100m"
  template:
    metadata:
      name: '{{name}}'
    spec:
      project: microservices
      source:
        repoURL: https://charts.myorg.com
        chart: '{{chart}}'
        targetRevision: '{{version}}'
        helm:
          values: |
            resources:
              requests:
                memory: {{memory}}
                cpu: {{cpu}}
              limits:
                memory: {{memory}}
                cpu: {{cpu}}
      destination:
        server: https://kubernetes.default.svc
        namespace: microservices
```

## Dynamic List Elements from ConfigMaps

While the List generator is static by definition, you can use external tools to dynamically update the ApplicationSet resource. A common pattern is using a CI pipeline or a controller to patch the elements array.

```bash
# Script that updates ApplicationSet elements from a config file
#!/bin/bash

# Read services from a config file
SERVICES=$(cat services.json)

# Patch the ApplicationSet with new elements
kubectl patch applicationset team-apps -n argocd --type merge -p "{
  \"spec\": {
    \"generators\": [{
      \"list\": {
        \"elements\": ${SERVICES}
      }
    }]
  }
}"
```

## Combining List Generator with Other Generators

The List generator becomes powerful when combined with the Matrix or Merge generators. For example, you can combine a List of environments with a Cluster generator to create environment-specific deployments per cluster.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: platform-services
  namespace: argocd
spec:
  generators:
  # Matrix combines List x Clusters
  - matrix:
      generators:
      - list:
          elements:
          - app: monitoring
            path: monitoring/base
          - app: logging
            path: logging/base
          - app: ingress
            path: ingress/base
      - clusters:
          selector:
            matchLabels:
              tier: production
  template:
    metadata:
      name: '{{app}}-{{name}}'
    spec:
      project: platform
      source:
        repoURL: https://github.com/myorg/platform
        targetRevision: main
        path: '{{path}}'
      destination:
        server: '{{server}}'
        namespace: '{{app}}-system'
```

This produces one Application per (app, cluster) combination. If you have 3 apps and 5 production clusters, you get 15 Applications.

## Handling Empty and Removed Elements

When you remove an element from the List generator, the corresponding Application gets deleted on the next reconciliation cycle. This is the expected behavior but can be surprising.

To protect against accidental deletions, configure the ApplicationSet sync policy.

```yaml
spec:
  syncPolicy:
    # Keep Kubernetes resources even when Application is deleted
    preserveResourcesOnDeletion: true
  generators:
  - list:
      elements:
      - name: critical-service
        # removing this element would normally delete the Application
```

You can also handle the empty list case. If all elements are removed, the generator produces zero parameter sets, which triggers deletion of all Applications. This is a safety concern in automation pipelines.

```bash
# Always validate that the list is non-empty before applying
ELEMENT_COUNT=$(yq '.spec.generators[0].list.elements | length' applicationset.yaml)
if [ "$ELEMENT_COUNT" -eq 0 ]; then
  echo "ERROR: Empty element list would delete all Applications"
  exit 1
fi
kubectl apply -f applicationset.yaml
```

## List Generator Best Practices

Keep element keys consistent across all elements. If one element has a key that others lack, the template will render an empty string for missing keys (unless you use Go templates with `missingkey=error`).

```yaml
# Good - all elements have the same keys
elements:
- name: svc-a
  tier: backend
  replicas: "3"
- name: svc-b
  tier: frontend
  replicas: "2"

# Problematic - svc-b is missing 'replicas'
elements:
- name: svc-a
  tier: backend
  replicas: "3"
- name: svc-b
  tier: frontend
```

Use the List generator when you need explicit control and the number of items is manageable. For dozens or hundreds of applications, consider the Git or SCM generators that discover parameters automatically. The List generator shines for small, well-defined sets where every parameter needs human review.
