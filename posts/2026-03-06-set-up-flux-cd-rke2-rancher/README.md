# How to Set Up Flux CD on RKE2 (Rancher Kubernetes Engine 2)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, rke2, rancher, kubernetes, gitops, continuous delivery, security, fips

Description: A practical guide to deploying Flux CD on RKE2, the security-focused Kubernetes distribution from Rancher, with FIPS compliance considerations.

---

## Introduction

RKE2, also known as RKE Government, is a fully CNCF-conformant Kubernetes distribution from Rancher (SUSE) that focuses on security and compliance. It is built for environments that require FIPS 140-2 compliance, CIS Kubernetes benchmark hardening, and minimal attack surface. RKE2 bundles containerd and etcd, and ships with sensible security defaults.

Combining RKE2 with Flux CD provides a GitOps workflow on a hardened Kubernetes platform suitable for government, financial, and healthcare environments.

## Prerequisites

Before you begin, ensure you have:

- At least two Linux machines (RHEL 8/9, Ubuntu 22.04, or SLES 15) with 4 CPU cores and 8 GB RAM
- Root or sudo access on all machines
- Network connectivity between all nodes with required ports open (6443, 9345, 10250, 2379, 2380)
- A GitHub account with a personal access token
- `kubectl` and `flux` CLI installed on your workstation

## Installing RKE2 on the Server Node

Install RKE2 on the first node (server/control plane):

```bash
# Install RKE2 server
curl -sfL https://get.rke2.io | sudo sh -

# Enable and start the RKE2 server service
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service

# Check the service status
sudo systemctl status rke2-server.service
```

## Configuring RKE2

Create a configuration file before starting RKE2 for custom settings:

```yaml
# /etc/rancher/rke2/config.yaml
# RKE2 server configuration
write-kubeconfig-mode: "0644"
tls-san:
  - "10.0.0.10"
  - "rke2-server.example.com"
# Enable CIS 1.23 hardening profile
profile: "cis"
# Use Canal (Calico + Flannel) as the CNI
cni:
  - canal
# Pod security admission configuration
pod-security-admission-config-file: /etc/rancher/rke2/psa.yaml
```

Create the Pod Security Admission configuration:

```yaml
# /etc/rancher/rke2/psa.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
  - name: PodSecurity
    configuration:
      apiVersion: pod-security.admission.config.k8s.io/v1
      kind: PodSecurityConfiguration
      defaults:
        enforce: "restricted"
        enforce-version: "latest"
        audit: "restricted"
        audit-version: "latest"
        warn: "restricted"
        warn-version: "latest"
      exemptions:
        namespaces:
          - kube-system
          - cis-operator-system
          # Exempt flux-system from restricted PSA
          - flux-system
        runtimeClasses: []
        usernames: []
```

## Configuring kubectl Access

Set up kubectl access to the RKE2 cluster:

```bash
# RKE2 stores kubeconfig at this path
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml

# For remote access, copy the kubeconfig to your workstation
sudo cat /etc/rancher/rke2/rke2.yaml > ~/.kube/rke2-config

# Update the server address if accessing remotely
sed -i 's/127.0.0.1/10.0.0.10/g' ~/.kube/rke2-config

export KUBECONFIG=~/.kube/rke2-config

# Verify cluster access
kubectl get nodes
```

## Adding Agent (Worker) Nodes

On each worker node, install RKE2 as an agent:

```bash
# Install RKE2 agent
curl -sfL https://get.rke2.io | INSTALL_RKE2_TYPE="agent" sudo sh -

# Create the agent configuration
sudo mkdir -p /etc/rancher/rke2
```

```yaml
# /etc/rancher/rke2/config.yaml (on agent nodes)
# RKE2 agent configuration
server: https://10.0.0.10:9345
token: <node-token-from-server>
# CIS hardening profile for agents
profile: "cis"
```

```bash
# Get the node token from the server
# Run this on the server node
sudo cat /var/lib/rancher/rke2/server/node-token

# Start the agent service
sudo systemctl enable rke2-agent.service
sudo systemctl start rke2-agent.service
```

## Verifying the RKE2 Cluster

Confirm the cluster is healthy:

```bash
# Check nodes
kubectl get nodes

# Verify system pods
kubectl get pods -n kube-system

# Check RKE2-specific components
kubectl get pods -n kube-system | grep -E "rke2|canal|etcd"
```

## Installing the Flux CLI

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the installation
flux --version
```

## Running Flux Pre-flight Checks

```bash
# Run pre-flight checks
flux check --pre
```

RKE2 provides all required Kubernetes APIs and RBAC capabilities for Flux.

## Preparing the Flux Namespace for RKE2 Security

Since RKE2 with CIS hardening enforces restricted Pod Security Standards, configure the flux-system namespace:

```yaml
# flux-namespace-labels.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: flux-system
  labels:
    # Allow Flux controllers to run with required permissions
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/warn: privileged
```

```bash
# Apply the namespace configuration
kubectl apply -f flux-namespace-labels.yaml
```

## Bootstrapping Flux CD

Set up credentials and bootstrap Flux:

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=rke2-gitops \
  --branch=main \
  --path=./clusters/rke2 \
  --personal
```

## Verifying the Installation

```bash
# Check Flux health
flux check

# List Flux pods
kubectl get pods -n flux-system

# Verify Git source
flux get sources git

# Confirm pods are running without SCC issues
kubectl describe pods -n flux-system | grep -A2 "Warning"
```

## Setting Up the Repository Structure

```bash
# Clone the repository
git clone https://github.com/$GITHUB_USER/rke2-gitops.git
cd rke2-gitops

# Create directory structure
mkdir -p clusters/rke2/infrastructure
mkdir -p clusters/rke2/apps
mkdir -p infrastructure/sources
mkdir -p infrastructure/controllers
mkdir -p apps/base
mkdir -p apps/production
```

## Deploying Infrastructure Components

Set up monitoring optimized for RKE2:

```yaml
# infrastructure/sources/prometheus.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 24h
  url: https://prometheus-community.github.io/helm-charts
```

```yaml
# infrastructure/controllers/monitoring.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: ">=55.0.0"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  targetNamespace: monitoring
  install:
    createNamespace: true
  values:
    # RKE2-specific etcd monitoring configuration
    kubeEtcd:
      # RKE2 runs etcd as a static pod
      endpoints:
        - 10.0.0.10
      service:
        enabled: true
        port: 2381
        targetPort: 2381
    # Namespace labels for pod security
    namespaceOverride: monitoring
    prometheus:
      prometheusSpec:
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 2Gi
    grafana:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
```

## Deploying Applications with Security Context

When deploying apps on CIS-hardened RKE2, security contexts are critical:

```yaml
# apps/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    managed-by: flux
    # Keep restricted PSA for application namespaces
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

```yaml
# apps/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      # Pod-level security context for restricted PSA compliance
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          image: nginx:1.27-alpine
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
          # Container-level security context
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /var/cache/nginx
            - name: run
              mountPath: /var/run
      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
        - name: run
          emptyDir: {}
```

```yaml
# apps/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: secure-app
  namespace: production
spec:
  selector:
    app: secure-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

```yaml
# apps/base/network-policy.yaml
# Network policies are important for CIS compliance
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: secure-app-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: secure-app
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

```yaml
# apps/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - network-policy.yaml
```

```yaml
# clusters/rke2/apps/secure-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secure-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: secure-app
      namespace: production
  timeout: 3m
```

## Integrating with Rancher

If you manage RKE2 through Rancher, Flux coexists well. Rancher handles cluster lifecycle while Flux handles application delivery:

```bash
# Import the RKE2 cluster into Rancher (run on the Rancher server)
# Rancher provides an import command from the UI

# Verify both Rancher and Flux are operating
kubectl get pods -n cattle-system
kubectl get pods -n flux-system
```

## Setting Up Notifications

```yaml
# clusters/rke2/apps/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: rke2-deployments
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: rke2-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Troubleshooting

Common debugging commands for Flux on RKE2:

```bash
# Check Flux controller logs
kubectl logs -n flux-system deploy/source-controller
kubectl logs -n flux-system deploy/kustomize-controller

# Force reconciliation
flux reconcile kustomization flux-system --with-source

# Check for PSA violations
kubectl get events -A --field-selector reason=FailedCreate | grep -i "forbidden"

# View RKE2 server logs
sudo journalctl -u rke2-server -f

# Check CIS benchmark compliance
kubectl get pods -n cis-operator-system

# Verify network policies are not blocking Flux
kubectl describe networkpolicy -n flux-system

# View Flux events
flux events
```

## Conclusion

You now have Flux CD running on an RKE2 cluster with CIS hardening enabled. This setup provides a security-focused GitOps platform suitable for regulated environments. RKE2's built-in security defaults combined with Flux's declarative deployment model ensure that your workloads are both securely configured and consistently deployed. Every change flows through Git, providing a complete audit trail of all modifications to your cluster.
