# How to Deploy Kubescape with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubescape, Kubernetes Security, GitOps, Compliance, Security Posture

Description: A practical guide to deploying Kubescape on Kubernetes using Flux CD for continuous security posture management and compliance scanning.

---

## Introduction

Kubescape is an open-source Kubernetes security platform that provides comprehensive security posture management. It scans clusters against multiple security frameworks including NSA-CISA, MITRE ATT&CK, and CIS Benchmarks, identifying misconfigurations, vulnerabilities, and compliance violations. Kubescape also performs image vulnerability scanning and RBAC analysis.

This guide walks through deploying Kubescape on Kubernetes using Flux CD, enabling continuous security assessment managed through GitOps.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.26 or later)
- Flux CD installed and bootstrapped
- kubectl configured for your cluster
- Kubescape CLI installed for manual scans
- A Git repository connected to Flux CD

## Architecture Overview

```mermaid
graph TD
    A[Git Repository] -->|Flux Sync| B[Flux CD]
    B -->|Reconcile| C[HelmRelease]
    C -->|Deploy| D[Kubescape Operator]
    C -->|Deploy| E[Kubescape Storage]
    C -->|Deploy| F[Kubevuln]
    D -->|Scan| G[NSA-CISA Framework]
    D -->|Scan| H[MITRE ATT&CK]
    D -->|Scan| I[CIS Benchmarks]
    F -->|Scan| J[Image Vulnerabilities]
    D -->|Store Results| E
    E -->|Expose| K[In-cluster API / UI integrations]
```

## Step 1: Create the Namespace

Define a namespace for Kubescape.

```yaml
# kubescape-namespace.yaml

# Dedicated namespace for Kubescape security platform
apiVersion: v1
kind: Namespace
metadata:
  name: kubescape
  labels:
    app.kubernetes.io/managed-by: flux
    app.kubernetes.io/name: kubescape
```

## Step 2: Add the Kubescape Helm Repository

Register the Kubescape Helm chart repository.

```yaml
# kubescape-helmrepo.yaml
# Official Kubescape Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kubescape
  namespace: kubescape
spec:
  interval: 1h
  url: https://kubescape.github.io/helm-charts/
```

## Step 3: Create the HelmRelease

Deploy Kubescape with all scanning components enabled.

```yaml
# kubescape-helmrelease.yaml
# Deploys the Kubescape security platform via Flux CD
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kubescape
  namespace: kubescape
spec:
  interval: 30m
  chart:
    spec:
      chart: kubescape-operator
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: kubescape
        namespace: kubescape
      interval: 12h
  values:
    # Cluster name for identification
    clusterName: production-cluster
    certificates:
      # Runtime certificate generation is safer for GitOps controllers
      strategy: hook

    # Enable Kubescape capabilities
    capabilities:
      operator: enable
      configurationScan: enable
      continuousScan: enable
      vulnerabilityScan: enable
      runtimeObservability: enable
      prometheusExporter: enable

    # Skip scanning specific namespaces
    excludeNamespaces: "kubescape,kube-system,kube-public"

    # Kubescape operator configuration
    kubescape:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
      # Create a ServiceMonitor for scan-result metrics
      serviceMonitor:
        enabled: true
        additionalLabels:
          release: prometheus

    # Scheduled configuration scanning
    kubescapeScheduler:
      scanSchedule: "0 */6 * * *"
      requestBody:
        commands:
          - CommandName: "kubescapeScan"
            args:
              scanV1:
                targetType: "framework"
                targetNames:
                  - "nsa"
                  - "mitre"
                  - "cis-v1.23"

    # Vulnerability scanning component
    kubevuln:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 1Gi

    # Scan schedule for vulnerability scanning
    kubevulnScheduler:
      scanSchedule: "0 */12 * * *"

    # Storage backend for scan results
    storage:
      resources:
        requests:
          cpu: 50m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi

    # Persistent volumes used by storage and kubevuln
    persistence:
      storageClass: standard
      size:
        backingStorage: 10Gi
        kubevuln: 10Gi

    # Node agent for runtime monitoring
    nodeAgent:
      config:
        prometheusExporter: enable
      serviceMonitor:
        enabled: true
        additionalLabels:
          release: prometheus
      resources:
        requests:
          cpu: 50m
          memory: 128Mi
        limits:
          cpu: 250m
          memory: 256Mi

    # Prometheus exporter for Kubescape CRD data
    prometheusExporter:
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 100m
          memory: 128Mi
```

## Step 4: Configure Scan Frameworks

Configure the scheduled configuration scan to target the frameworks you want.

```yaml
# Add under spec.values in kubescape-helmrelease.yaml
kubescapeScheduler:
  requestBody:
    commands:
      - CommandName: "kubescapeScan"
        args:
          scanV1:
            targetType: "framework"
            targetNames:
              - "nsa"
              - "mitre"
              - "cis-v1.23"
```

## Step 5: Set Up Prometheus Monitoring

Enable ServiceMonitor resources through the HelmRelease values and create alert rules for Kubescape metrics.

```yaml
# Alert rules for Kubescape findings
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubescape-alerts
  namespace: kubescape
  labels:
    release: prometheus
spec:
  groups:
    - name: kubescape-compliance
      rules:
        # Alert when compliance score drops below threshold
        - alert: LowComplianceScore
          expr: >
            kubescape_framework_complianceScore{name="NSA"} < 70
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "NSA compliance score below 70%"
            description: >
              The NSA framework compliance score is {{ $value }}%.
              Review and remediate failing controls.

        # Alert on critical control failures
        - alert: CriticalControlFailed
          expr: >
            kubescape_controls_total_cluster_critical > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Critical Kubescape controls detected"
            description: >
              Kubescape detected {{ $value }} critical control findings.

        # Alert on new high vulnerabilities
        - alert: HighVulnerabilityDetected
          expr: >
            kubescape_vulnerabilities_total_cluster_high > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "New high severity vulnerabilities detected"
            description: "{{ $value }} new high severity vulnerabilities found."
```

## Step 6: Configure Network Policies

Secure Kubescape component communication.

```yaml
# kubescape-networkpolicy.yaml
# Network policy for Kubescape operator
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: kubescape-operator-policy
  namespace: kubescape
spec:
  podSelector:
    matchExpressions:
      - key: app.kubernetes.io/component
        operator: In
        values:
          - kubescape
          - operator
          - kubevuln
          - storage
          - node-agent
          - prometheus-exporter
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow metrics scraping
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
      ports:
        - protocol: TCP
          port: 8080
    # Allow internal communication between components
    - from:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 8080
        - protocol: TCP
          port: 4002
        - protocol: TCP
          port: 8089
        - protocol: TCP
          port: 8443
        - protocol: TCP
          port: 443
  egress:
    # Allow DNS
    - ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Allow HTTPS for downloading frameworks and vulnerability data
    - ports:
        - protocol: TCP
          port: 443
    # Allow communication with K8s API server
    - ports:
        - protocol: TCP
          port: 6443
    # Allow internal communication
    - to:
        - podSelector: {}
```

## Step 7: Set Up the Flux Kustomization

Orchestrate all Kubescape resources.

```yaml
# kustomization.yaml
# Flux Kustomization for Kubescape
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubescape
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: kubescape
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/kubescape
  prune: true
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: kubescape
      namespace: kubescape
  timeout: 10m
```

## Step 8: Verify the Deployment

After pushing to Git, verify the deployment.

```bash
# Check Flux reconciliation
flux get helmreleases -n kubescape

# Verify all Kubescape pods are running
kubectl get pods -n kubescape

# Verify Kubescape deployments
kubectl get deployments -n kubescape

# Trigger a configuration scan through the operator
kubescape operator scan configurations --namespace kubescape

# Trigger a vulnerability scan through the operator
kubescape operator scan vulnerabilities --namespace kubescape

# Check vulnerability scan results
kubectl get vulnerabilitymanifestsummaries -A

# List workload scan summaries
kubectl get workloadconfigurationscansummaries -A

# View detailed results for a specific workload
kubectl get workloadconfigurationscans -n default -o yaml
```

## Step 9: Review Compliance Reports

Check compliance against various frameworks.

```bash
# Run NSA framework scan
kubescape scan framework nsa --format pretty-printer

# Run MITRE ATT&CK scan
kubescape scan framework mitre --format pretty-printer

# Run CIS Benchmark scan
kubescape scan framework cis-v1.23 --format pretty-printer

# Scan a specific namespace
kubescape scan framework nsa --include-namespaces default,production
```

## Troubleshooting

Common issues and solutions:

```bash
# Check operator logs
kubectl logs -n kubescape deploy/operator --tail=100

# Verify CRDs are installed
kubectl get crds | grep kubescape

# Check storage component
kubectl logs -n kubescape deploy/storage --tail=50

# Verify vulnerability scanner
kubectl logs -n kubescape deploy/kubevuln --tail=50

# Check Flux errors
kubectl describe helmrelease kubescape -n kubescape

# Force reconciliation
flux reconcile helmrelease kubescape -n kubescape

# Check persistent volume claims
kubectl get pvc -n kubescape
```

## Conclusion

You have successfully deployed Kubescape on Kubernetes using Flux CD. Your cluster is now continuously assessed against NSA-CISA, MITRE ATT&CK, and CIS security frameworks. With Prometheus integration and alerting, you will be notified when compliance scores drop or critical security controls fail. The GitOps approach ensures your security posture management configuration is consistent, auditable, and version-controlled.
