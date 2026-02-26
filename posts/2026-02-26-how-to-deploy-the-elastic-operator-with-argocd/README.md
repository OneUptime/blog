# How to Deploy the Elastic Operator with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Elasticsearch, ECK

Description: Learn how to deploy the Elastic Cloud on Kubernetes (ECK) Operator with ArgoCD for GitOps-managed Elasticsearch, Kibana, and Fleet Server deployments.

---

Elastic Cloud on Kubernetes (ECK) is the official operator for running the Elastic Stack on Kubernetes. It manages Elasticsearch clusters, Kibana instances, APM Server, Fleet Server, and Beats agents. Deploying ECK with ArgoCD gives you a fully GitOps-managed observability and search platform where every configuration change is reviewed, tracked, and reproducible.

This guide covers deploying the Elastic Operator with ArgoCD and setting up a production Elasticsearch cluster.

## What ECK Manages

The ECK Operator handles the lifecycle of:

- Elasticsearch clusters (node topology, scaling, upgrades)
- Kibana instances
- APM Server
- Fleet Server and Elastic Agents
- Enterprise Search
- Beats (Filebeat, Metricbeat, etc.)
- Logstash

All of these are defined as Custom Resources, making them perfect for GitOps management.

## Step 1: Deploy ECK CRDs

ECK CRDs are relatively large. Deploy them separately:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: elastic-crds
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
spec:
  project: default
  source:
    repoURL: https://helm.elastic.co
    chart: eck-operator-crds
    targetRevision: 2.11.1
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
      - Replace=true
      - Prune=false
```

## Step 2: Deploy the ECK Operator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: elastic-operator
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  project: default
  source:
    repoURL: https://helm.elastic.co
    chart: eck-operator
    targetRevision: 2.11.1
    helm:
      values: |
        # Do not install CRDs via Helm
        installCRDs: false
        createClusterScopedResources: true

        # Manage all namespaces
        managedNamespaces: []

        # Operator resources
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            memory: 512Mi

        # Webhook configuration
        webhook:
          enabled: true

        # Telemetry
        telemetry:
          disabled: true

        # Log verbosity
        config:
          logVerbosity: 0
  destination:
    server: https://kubernetes.default.svc
    namespace: elastic-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## Step 3: Deploy an Elasticsearch Cluster

Here is a production-ready Elasticsearch cluster with dedicated node roles:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: elastic
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
---
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: production
  namespace: elastic
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  version: 8.12.0
  nodeSets:
    # Master nodes - coordinate cluster state
    - name: master
      count: 3
      config:
        node.roles: ["master"]
        # Disable machine learning on master nodes
        xpack.ml.enabled: false
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  cpu: 500m
                  memory: 2Gi
                limits:
                  memory: 2Gi
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms1g -Xmx1g"
          initContainers:
            - name: sysctl
              securityContext:
                privileged: true
                runAsUser: 0
              command: ['sh', '-c', 'sysctl -w vm.max_map_count=262144']
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 10Gi
            storageClassName: gp3

    # Data nodes - store and search data
    - name: data
      count: 3
      config:
        node.roles: ["data", "data_content", "data_hot", "ingest", "transform"]
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  cpu: "2"
                  memory: 8Gi
                limits:
                  memory: 8Gi
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms4g -Xmx4g"
          initContainers:
            - name: sysctl
              securityContext:
                privileged: true
                runAsUser: 0
              command: ['sh', '-c', 'sysctl -w vm.max_map_count=262144']
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 500Gi
            storageClassName: gp3

    # Coordinating nodes - handle search routing
    - name: coordinating
      count: 2
      config:
        node.roles: ["remote_cluster_client"]
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  cpu: "1"
                  memory: 4Gi
                limits:
                  memory: 4Gi
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms2g -Xmx2g"
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 10Gi
            storageClassName: gp3

  # HTTP configuration
  http:
    tls:
      selfSignedCertificate:
        disabled: false
    service:
      spec:
        type: ClusterIP
```

## Step 4: Deploy Kibana

```yaml
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: production
  namespace: elastic
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  version: 8.12.0
  count: 2
  elasticsearchRef:
    name: production
  podTemplate:
    spec:
      containers:
        - name: kibana
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              memory: 2Gi
  http:
    tls:
      selfSignedCertificate:
        disabled: false
    service:
      spec:
        type: ClusterIP
  config:
    # Server settings
    server.publicBaseUrl: "https://kibana.example.com"
    # Monitoring
    monitoring.ui.ccs.enabled: false
```

## Step 5: Deploy Filebeat for Log Collection

```yaml
apiVersion: beat.k8s.elastic.co/v1beta1
kind: Beat
metadata:
  name: filebeat
  namespace: elastic
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  type: filebeat
  version: 8.12.0
  elasticsearchRef:
    name: production
  kibanaRef:
    name: production
  config:
    filebeat.autodiscover:
      providers:
        - type: kubernetes
          node: ${NODE_NAME}
          hints.enabled: true
          hints.default_config:
            type: container
            paths:
              - /var/log/containers/*${data.kubernetes.container.id}.log
    processors:
      - add_cloud_metadata: {}
      - add_host_metadata: {}
      - add_kubernetes_metadata:
          host: ${NODE_NAME}
  daemonSet:
    podTemplate:
      spec:
        serviceAccountName: filebeat
        automountServiceAccountToken: true
        dnsPolicy: ClusterFirstWithHostNet
        hostNetwork: true
        containers:
          - name: filebeat
            resources:
              requests:
                cpu: 100m
                memory: 200Mi
              limits:
                memory: 500Mi
            volumeMounts:
              - name: varlogcontainers
                mountPath: /var/log/containers
              - name: varlogpods
                mountPath: /var/log/pods
              - name: varlibdockercontainers
                mountPath: /var/lib/docker/containers
        volumes:
          - name: varlogcontainers
            hostPath:
              path: /var/log/containers
          - name: varlogpods
            hostPath:
              path: /var/log/pods
          - name: varlibdockercontainers
            hostPath:
              path: /var/lib/docker/containers
```

## Custom Health Checks

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.elasticsearch.k8s.elastic.co_Elasticsearch: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.health == "green" then
        hs.status = "Healthy"
        hs.message = "Elasticsearch cluster is green"
      elseif obj.status.health == "yellow" then
        hs.status = "Healthy"
        hs.message = "Elasticsearch cluster is yellow (replicas may be unassigned)"
      elseif obj.status.health == "red" then
        hs.status = "Degraded"
        hs.message = "Elasticsearch cluster is red"
      elseif obj.status.phase == "ApplyingChanges" then
        hs.status = "Progressing"
        hs.message = "Elasticsearch is applying changes"
      else
        hs.status = "Progressing"
        hs.message = "Elasticsearch phase: " .. (obj.status.phase or "Unknown")
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for Elasticsearch status"
    end
    return hs

  resource.customizations.health.kibana.k8s.elastic.co_Kibana: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.health == "green" then
        hs.status = "Healthy"
        hs.message = "Kibana is healthy"
      elseif obj.status.health == "red" then
        hs.status = "Degraded"
        hs.message = "Kibana is unhealthy"
      else
        hs.status = "Progressing"
        hs.message = "Kibana is starting"
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for Kibana status"
    end
    return hs
```

## Handling Elasticsearch Upgrades

ECK handles rolling upgrades automatically. When you change the `version` field in the Elasticsearch CR, the operator performs a rolling restart respecting shard allocation and cluster health.

Important: Always upgrade one minor version at a time. Do not jump from 7.x to 8.x directly.

```yaml
# Update version in Git - ArgoCD syncs automatically
spec:
  version: 8.13.0  # Changed from 8.12.0
```

Monitor the upgrade progress:

```bash
# Watch the upgrade
kubectl get elasticsearch -n elastic -w

# Check node status
kubectl get pods -n elastic -l elasticsearch.k8s.elastic.co/cluster-name=production
```

## Accessing Elasticsearch Credentials

ECK creates a Secret with the elastic user password:

```bash
# Get the elastic user password
kubectl get secret production-es-elastic-user -n elastic \
  -o go-template='{{.data.elastic | base64decode}}'
```

For applications, reference the Secret in your deployment:

```yaml
env:
  - name: ELASTICSEARCH_PASSWORD
    valueFrom:
      secretKeyRef:
        name: production-es-elastic-user
        key: elastic
  - name: ELASTICSEARCH_URL
    value: "https://production-es-http.elastic.svc:9200"
```

## Summary

Deploying the Elastic Operator with ArgoCD gives you a GitOps-managed Elastic Stack. Define your Elasticsearch clusters, Kibana instances, and Beats agents in Git, and ArgoCD handles deployments and drift detection. The key is proper sync wave ordering, custom health checks for Elastic CRs, and using server-side apply for large CRDs. For more on managing operators with ArgoCD, see our guide on [deploying Kubernetes operators with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-how-to-deploy-kubernetes-operators-with-argocd/view).
