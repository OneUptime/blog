# How to Deploy OpenSearch with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, OpenSearch, Search, Analytics

Description: Deploy OpenSearch search and analytics engine to Kubernetes using Flux CD HelmRelease for GitOps-managed search infrastructure.

---

## Introduction

OpenSearch is the open-source fork of Elasticsearch maintained by AWS and the community following the license change in Elasticsearch 7.10. It is API-compatible with Elasticsearch 7.x and includes security, alerting, anomaly detection, and index state management plugins out of the box without requiring a commercial license. For teams that need a self-hosted, fully open-source search and log analytics platform, OpenSearch is the leading choice.

Deploying OpenSearch via Flux CD gives you GitOps control over cluster topology, security configuration, index templates, and plugin management. Every change to the OpenSearch cluster configuration passes through a pull request, reducing the risk of accidental misconfiguration in production.

This guide deploys a production-grade OpenSearch cluster using the official Helm chart as a Flux HelmRelease, configures TLS, and sets up an Ingress for external access.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs (at least 50 GB available)
- At least 6 GiB of cluster memory available
- `kubectl` and `flux` CLIs installed

## Step 1: Add the OpenSearch HelmRepository

```yaml
# infrastructure/sources/opensearch-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: opensearch
  namespace: flux-system
spec:
  interval: 12h
  url: https://opensearch-project.github.io/helm-charts
```

## Step 2: Create the Search Namespace

```yaml
# infrastructure/search/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: search
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 3: Deploy OpenSearch Cluster

```yaml
# infrastructure/search/opensearch.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: opensearch
  namespace: search
spec:
  interval: 30m
  chart:
    spec:
      chart: opensearch
      version: "2.23.0"
      sourceRef:
        kind: HelmRepository
        name: opensearch
        namespace: flux-system
  values:
    # Deploy a 3-node cluster
    replicas: 3

    # OpenSearch version
    opensearchJavaOpts: "-Xmx1g -Xms1g"

    resources:
      requests:
        cpu: "500m"
        memory: "2Gi"
      limits:
        cpu: "1000m"
        memory: "2Gi"

    persistence:
      enabled: true
      size: 50Gi

    # Security configuration
    config:
      opensearch.yml: |
        cluster.name: opensearch-cluster
        network.host: 0.0.0.0

        # TLS for HTTP layer
        plugins.security.ssl.http.enabled: true
        plugins.security.ssl.http.pemcert_filepath: esnode.pem
        plugins.security.ssl.http.pemkey_filepath: esnode-key.pem
        plugins.security.ssl.http.pemtrustedcas_filepath: root-ca.pem

        # TLS for transport layer (node-to-node)
        plugins.security.ssl.transport.pemcert_filepath: esnode.pem
        plugins.security.ssl.transport.pemkey_filepath: esnode-key.pem
        plugins.security.ssl.transport.pemtrustedcas_filepath: root-ca.pem
        plugins.security.ssl.transport.enforce_hostname_verification: false

        # Allow demo certificates (replace with real certs in production)
        plugins.security.allow_unsafe_democertificates: true
        plugins.security.allow_default_init_securityindex: true

        # Audit logging
        plugins.security.audit.type: internal_opensearch

    # Security plugin configuration
    securityConfig:
      enabled: true

    # Environment variables
    extraEnvs:
      - name: OPENSEARCH_INITIAL_ADMIN_PASSWORD
        valueFrom:
          secretKeyRef:
            name: opensearch-credentials
            key: admin-password

    # Anti-affinity to spread pods across nodes
    antiAffinity: soft
```

## Step 4: Store Admin Credentials in a Secret

```yaml
# infrastructure/search/opensearch-secret.yaml (use SealedSecret in production)
apiVersion: v1
kind: Secret
metadata:
  name: opensearch-credentials
  namespace: search
type: Opaque
stringData:
  admin-password: "MyStr0ngP@ssword!"
```

## Step 5: Configure Index State Management

Define index lifecycle policies using OpenSearch's ISM via an init Job:

```yaml
# infrastructure/search/opensearch-ism-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: opensearch-ism-setup
  namespace: search
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: ism-setup
          image: curlimages/curl:8.7.1
          command:
            - /bin/sh
            - -c
            - |
              # Wait for OpenSearch to be ready
              until curl -s -k -u admin:${ADMIN_PASSWORD} \
                https://opensearch-cluster-master:9200/_cluster/health | grep -q '"status":"green"'; do
                echo "Waiting for OpenSearch..."; sleep 10
              done
              # Create a 30-day rollover ISM policy
              curl -s -k -XPUT \
                -u admin:${ADMIN_PASSWORD} \
                -H "Content-Type: application/json" \
                https://opensearch-cluster-master:9200/_plugins/_ism/policies/30-day-rollover \
                -d '{"policy":{"description":"Rollover after 30 days","default_state":"open","states":[{"name":"open","actions":[],"transitions":[{"state_name":"rollover","conditions":{"min_index_age":"30d"}}]},{"name":"rollover","actions":[{"rollover":{"min_index_age":"30d"}}],"transitions":[]}]}}'
          env:
            - name: ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: opensearch-credentials
                  key: admin-password
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/production/search-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: opensearch
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/search
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: opensearch-cluster-master
      namespace: search
```

## Step 7: Verify the Cluster

```bash
# Check all pods are running
kubectl get pods -n search

# Port-forward and verify cluster health
kubectl port-forward -n search svc/opensearch-cluster-master 9200:9200

curl -s -k -u admin:MyStr0ngP@ssword! \
  https://localhost:9200/_cluster/health | jq .

# Check installed plugins
curl -s -k -u admin:MyStr0ngP@ssword! \
  https://localhost:9200/_cat/plugins?v
```

## Best Practices

- Replace demo certificates with real TLS certificates from cert-manager before going to production.
- Use ISM policies to automatically roll over, transition to warm storage, and delete old indices.
- Enable the Security plugin's audit logging to track all API access for compliance.
- Store `OPENSEARCH_INITIAL_ADMIN_PASSWORD` in a SealedSecret or External Secret rather than plaintext.
- Configure `PodDisruptionBudget` to ensure rolling upgrades never take the cluster below quorum.

## Conclusion

OpenSearch deployed through Flux CD gives you a fully open-source search and log analytics platform with enterprise-grade security included. Every cluster configuration change — from shard allocation settings to security plugin rules — is a Git commit reviewed by your team. From here you can deploy OpenSearch Dashboards for visualization and integrate Fluent Bit or Vector for log shipping, all managed through the same GitOps workflow.
