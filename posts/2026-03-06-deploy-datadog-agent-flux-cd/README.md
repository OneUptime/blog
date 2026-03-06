# How to Deploy Datadog Agent with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, datadog, monitoring, agent, gitops, kubernetes, observability, apm

Description: A practical guide to deploying the Datadog Agent on Kubernetes using Flux CD for GitOps-managed monitoring, APM, and log collection.

---

## Introduction

The Datadog Agent is the core component of the Datadog monitoring platform. It runs on every node in your Kubernetes cluster, collecting metrics, traces, and logs from your containers and infrastructure. Deploying the Datadog Agent with Flux CD enables you to manage your monitoring configuration through Git, ensuring consistency across environments and enabling auditable changes.

This guide covers deploying the Datadog Agent as a DaemonSet using the official Helm chart through Flux CD, including APM configuration, log collection, and secure API key management.

## Prerequisites

- A Kubernetes cluster (v1.26 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- A Datadog account with an API key and App key
- kubectl configured for your cluster

## Repository Structure

```
clusters/
  my-cluster/
    datadog/
      namespace.yaml
      helmrepository.yaml
      helmrelease.yaml
      secret.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/datadog/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: datadog
  labels:
    toolkit.fluxcd.io/tenant: monitoring
```

## Step 2: Create the API Key Secret

Store the Datadog API key securely. In production, use Sealed Secrets or SOPS to encrypt this secret in your Git repository.

```yaml
# clusters/my-cluster/datadog/secret.yaml
# IMPORTANT: Encrypt this file with SOPS or Sealed Secrets before committing
apiVersion: v1
kind: Secret
metadata:
  name: datadog-api-secret
  namespace: datadog
type: Opaque
stringData:
  # Replace with your actual Datadog API key
  api-key: "YOUR_DATADOG_API_KEY"
  # Replace with your actual Datadog App key
  app-key: "YOUR_DATADOG_APP_KEY"
```

To encrypt the secret with SOPS, run:

```bash
# Encrypt the secret file before committing to Git
sops --encrypt --in-place clusters/my-cluster/datadog/secret.yaml
```

## Step 3: Add the Helm Repository

```yaml
# clusters/my-cluster/datadog/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: datadog
  namespace: datadog
spec:
  interval: 1h
  url: https://helm.datadoghq.com
```

## Step 4: Create the HelmRelease

Deploy the Datadog Agent with comprehensive monitoring features enabled.

```yaml
# clusters/my-cluster/datadog/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: datadog-agent
  namespace: datadog
spec:
  interval: 30m
  chart:
    spec:
      chart: datadog
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: datadog
      interval: 12h
  timeout: 10m
  values:
    # Reference the API key from the Kubernetes secret
    datadog:
      apiKeyExistingSecret: datadog-api-secret
      appKeyExistingSecret: datadog-api-secret

      # Set the Datadog site (US1, US3, US5, EU1, AP1)
      site: datadoghq.com

      # Set the cluster name for identification in Datadog
      clusterName: my-production-cluster

      # Enable log collection from all containers
      logs:
        enabled: true
        containerCollectAll: true
        # Autodiscovery configuration for log processing
        autoMultiLineDetection:
          enabled: true

      # Enable APM (Application Performance Monitoring)
      apm:
        portEnabled: true
        # Socket-based communication for better performance
        socketEnabled: true
        socketPath: /var/run/datadog/apm.socket

      # Enable process monitoring
      processAgent:
        enabled: true
        processCollection: true

      # Enable network performance monitoring
      networkMonitoring:
        enabled: true

      # Enable container runtime metrics
      containerExclude: "image:gcr.io/datadoghq/agent"

      # Kubernetes integration settings
      kubeStateMetricsEnabled: true
      kubeStateMetricsCore:
        enabled: true

      # Cluster-level checks for monitoring cluster-wide resources
      clusterChecks:
        enabled: true

      # Prometheus scraping for pods with annotations
      prometheusScrape:
        enabled: true
        serviceEndpoints: true

    # Agent DaemonSet configuration
    agents:
      # Resource allocation for the agent running on each node
      containers:
        agent:
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 512Mi
        # Trace agent container resources
        traceAgent:
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
        # Process agent container resources
        processAgent:
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi

      # Tolerations to allow the agent to run on all nodes
      tolerations:
        - operator: Exists

    # Cluster Agent configuration for cluster-level monitoring
    clusterAgent:
      enabled: true
      replicas: 2
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
      # Enable metrics provider for HPA based on Datadog metrics
      metricsProvider:
        enabled: true
        useDatadogMetrics: true
```

## Step 5: Create the Kustomization

```yaml
# clusters/my-cluster/datadog/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - secret.yaml
  - helmrepository.yaml
  - helmrelease.yaml
```

## Step 6: Enable SOPS Decryption in Flux

If using SOPS for secret encryption, configure the Flux Kustomization to decrypt secrets.

```yaml
# clusters/my-cluster/datadog-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: datadog
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: datadog
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/datadog
  prune: true
  wait: true
  timeout: 10m
  # Enable SOPS decryption for encrypted secrets
  decryption:
    provider: sops
    secretRef:
      name: sops-gpg
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v1
      kind: HelmRelease
      name: datadog-agent
      namespace: datadog
```

## Step 7: Configure Autodiscovery Annotations

Use Datadog Autodiscovery annotations to automatically configure monitoring for your applications.

```yaml
# Example: Application deployment with Datadog Autodiscovery annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-web-app
  template:
    metadata:
      labels:
        app: my-web-app
      annotations:
        # Configure a custom check for this application
        ad.datadoghq.com/my-web-app.checks: |
          {
            "http_check": {
              "instances": [
                {
                  "name": "my-web-app-health",
                  "url": "http://%%host%%:8080/health",
                  "timeout": 5
                }
              ]
            }
          }
        # Configure log processing for this container
        ad.datadoghq.com/my-web-app.logs: |
          [
            {
              "source": "python",
              "service": "my-web-app",
              "log_processing_rules": [
                {
                  "type": "multi_line",
                  "name": "log_start_with_date",
                  "pattern": "\\d{4}-\\d{2}-\\d{2}"
                }
              ]
            }
          ]
    spec:
      containers:
        - name: my-web-app
          image: my-web-app:latest
          ports:
            - containerPort: 8080
          env:
            # APM tracing environment variables
            - name: DD_AGENT_HOST
              valueFrom:
                fieldRef:
                  fieldPath: status.hostIP
            - name: DD_TRACE_AGENT_PORT
              value: "8126"
            - name: DD_SERVICE
              value: "my-web-app"
            - name: DD_ENV
              value: "production"
            - name: DD_VERSION
              value: "1.0.0"
```

## Verifying the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations datadog

# Check HelmRelease status
flux get helmreleases -n datadog

# Verify agent pods are running on all nodes
kubectl get pods -n datadog -o wide

# Check agent status on a specific node
kubectl exec -n datadog $(kubectl get pods -n datadog -l app=datadog -o jsonpath='{.items[0].metadata.name}') -- agent status

# Verify cluster agent is running
kubectl get pods -n datadog -l app=datadog-cluster-agent
```

## Troubleshooting

- **Agent not starting**: Check if the API key secret exists and contains valid keys. Run `kubectl describe pod` to see events.
- **No logs appearing**: Ensure `logs.enabled` and `containerCollectAll` are both set to true. Check agent logs for permission errors on `/var/log/pods`.
- **APM traces missing**: Verify that application pods have the correct `DD_AGENT_HOST` environment variable pointing to the node IP via the downward API.
- **High memory usage**: Adjust the agent memory limits or exclude high-volume containers from log collection using `containerExclude`.
- **Network monitoring not working**: Network Performance Monitoring requires kernel headers. Check if your node OS supports eBPF.

## Conclusion

You have deployed the Datadog Agent on Kubernetes using Flux CD. This setup provides comprehensive monitoring including infrastructure metrics, APM traces, log collection, and network monitoring. All configuration is managed through Git, allowing you to track changes, review monitoring updates in pull requests, and roll back if issues arise. The Datadog Cluster Agent provides cluster-level visibility and enables Horizontal Pod Autoscaling based on Datadog metrics.
