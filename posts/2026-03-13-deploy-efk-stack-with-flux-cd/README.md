# How to Deploy EFK Stack with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Elasticsearch, Fluentd, Kibana, EFK

Description: Deploy Elasticsearch, Fluentd, and Kibana (EFK) logging stack to Kubernetes using Flux CD GitOps workflows.

---

## Introduction

The EFK stack — Elasticsearch, Fluentd, and Kibana — is one of the most widely adopted logging solutions in the Kubernetes ecosystem. Elasticsearch provides distributed search and analytics storage, Fluentd collects and aggregates logs from across your cluster, and Kibana delivers powerful visualization and querying capabilities. Together they give platform teams full observability into application and infrastructure logs.

Managing the EFK stack with Flux CD brings the same GitOps discipline you apply to your applications. All configuration lives in Git, changes are auditable, and the cluster converges automatically to the desired state. This eliminates configuration drift and makes onboarding new clusters straightforward.

In this post you will use Flux CD HelmRelease resources to deploy each component of the EFK stack, wire them together, and expose Kibana through an Ingress. All manifests follow real-world production patterns including resource limits and persistent storage.

## Prerequisites

- A running Kubernetes cluster (v1.26+)
- Flux CD bootstrapped to a Git repository (`flux bootstrap`)
- `kubectl` and `flux` CLIs installed
- A StorageClass that supports `ReadWriteOnce` PersistentVolumeClaims
- An Ingress controller (e.g., ingress-nginx) deployed in the cluster

## Step 1: Create the Logging Namespace and HelmRepository Sources

Create a dedicated namespace and add the Elastic Helm repository as a Flux `HelmRepository` source.

```yaml
# clusters/my-cluster/logging/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: logging
  labels:
    toolkit.fluxcd.io/tenant: platform
```

```yaml
# clusters/my-cluster/logging/helm-repos.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: elastic
  namespace: flux-system
spec:
  interval: 12h
  url: https://helm.elastic.co
```

Commit and push these files. Flux will reconcile them within the next sync interval.

## Step 2: Deploy Elasticsearch

Deploy Elasticsearch using a `HelmRelease`. The values configure a three-node cluster with persistent storage and appropriate JVM heap sizing.

```yaml
# clusters/my-cluster/logging/elasticsearch.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: elasticsearch
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: elasticsearch
      version: "8.5.1"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
  values:
    replicas: 3
    minimumMasterNodes: 2
    # Set JVM heap to half of container memory limit
    esJavaOpts: "-Xmx1g -Xms1g"
    resources:
      requests:
        cpu: "500m"
        memory: "2Gi"
      limits:
        cpu: "1000m"
        memory: "2Gi"
    persistence:
      enabled: true
      size: 30Gi
    # Disable TLS for internal cluster communication in this example
    esConfig:
      elasticsearch.yml: |
        xpack.security.enabled: false
```

## Step 3: Deploy Fluentd

Fluentd runs as a DaemonSet so it collects logs from every node. Configure its output to point at the Elasticsearch service deployed in the previous step.

```yaml
# clusters/my-cluster/logging/fluentd.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: fluentd
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: fluentd
      version: "0.5.2"
      sourceRef:
        kind: HelmRepository
        name: bitnami  # add a bitnami HelmRepository source
        namespace: flux-system
  values:
    aggregator:
      enabled: false
    forwarder:
      enabled: true
      configMap: fluentd-forwarder-config
    # Pass the Elasticsearch endpoint via environment variable
    extraEnvVars:
      - name: ELASTICSEARCH_HOST
        value: "elasticsearch-master.logging.svc.cluster.local"
      - name: ELASTICSEARCH_PORT
        value: "9200"
```

## Step 4: Deploy Kibana

```yaml
# clusters/my-cluster/logging/kibana.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: kibana
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: kibana
      version: "8.5.1"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
  values:
    elasticsearchHosts: "http://elasticsearch-master.logging.svc.cluster.local:9200"
    resources:
      requests:
        cpu: "200m"
        memory: "512Mi"
      limits:
        cpu: "500m"
        memory: "1Gi"
    ingress:
      enabled: true
      annotations:
        kubernetes.io/ingress.class: nginx
      hosts:
        - host: kibana.example.com
          paths:
            - path: /
```

## Step 5: Organize with a Kustomization

Wire all the resources together using a Flux `Kustomization` so they are reconciled as a unit.

```yaml
# clusters/my-cluster/logging/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: logging-stack
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/logging
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: elasticsearch-master
      namespace: logging
    - apiVersion: apps/v1
      kind: Deployment
      name: kibana-kibana
      namespace: logging
```

## Step 6: Verify the Deployment

```bash
# Watch Flux reconcile the logging stack
flux get kustomizations logging-stack --watch

# Check all pods are running
kubectl get pods -n logging

# Port-forward Kibana for local access
kubectl port-forward svc/kibana-kibana 5601:5601 -n logging
```

Open `http://localhost:5601` and navigate to **Discover** to start querying your logs.

## Best Practices

- Pin chart versions in every `HelmRelease` to prevent unexpected upgrades during reconciliation.
- Enable Elasticsearch index lifecycle management (ILM) to automatically roll over and delete old indices.
- Store Elasticsearch credentials in Kubernetes Secrets managed by Sealed Secrets or External Secrets Operator, never in plaintext in Git.
- Set `prune: true` on the Flux `Kustomization` so deleted manifests are removed from the cluster.
- Configure `healthChecks` so Flux waits for StatefulSets to become ready before marking the reconciliation successful.

## Conclusion

You now have a fully GitOps-managed EFK logging stack running on Kubernetes. Every change to Elasticsearch configuration, Fluentd pipelines, or Kibana settings goes through a Git pull request, giving your team a clear audit trail and the ability to roll back instantly by reverting a commit. From here you can extend the stack by adding index lifecycle policies, Kibana dashboards as code, and alerting rules — all managed through Flux.
