# Explaining Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, Networking, CNI, Scaling

Description: Understand what Calico Typha is and why it matters for large Kubernetes clusters. This post explains the architecture, data flow, and scaling model of Typha when configuring Calico without an operator.

---

## Introduction

When Kubernetes clusters grow beyond a few dozen nodes, the default Calico architecture begins to show strain. Every Felix agent on every node opens a direct watch connection to the Kubernetes API server. At scale, this creates thousands of concurrent connections and redundant watch traffic that can overwhelm the API server.

Typha solves this problem by acting as a fan-out cache between Felix agents and the Kubernetes API server. Instead of each Felix instance watching the API server directly, they all connect to a small pool of Typha pods. Typha holds a single watch connection per resource type and broadcasts updates to all connected Felix agents.

This post explains the Typha architecture, when to enable it, and how it fits into a "hard way" Calico deployment — meaning you configure Typha manually without relying on the Calico Operator.

---

## Prerequisites

- A running Kubernetes cluster (1.24+)
- Calico installed in manifest mode (not via the Calico Operator)
- `calicoctl` CLI configured against your cluster
- Basic familiarity with Calico Felix and the projectcalico.org/v3 API

---

## Step 1: Understand the Default Felix Architecture

Without Typha, every Felix agent connects directly to the Kubernetes API server:

```
Felix (node-1) --> kube-apiserver
Felix (node-2) --> kube-apiserver
Felix (node-3) --> kube-apiserver
...
Felix (node-N) --> kube-apiserver
```

Each Felix instance watches several resource types including `NetworkPolicy`, `HostEndpoint`, `IPPool`, and node objects. At 200 nodes, this translates to hundreds of concurrent watch streams hitting the API server simultaneously.

---

## Step 2: Understand the Typha Architecture

Typha inserts a caching layer:

```
Felix (node-1) --> Typha pod --> kube-apiserver
Felix (node-2) --> Typha pod
Felix (node-3) --> Typha pod
...
Felix (node-N) --> Typha pod (another replica)
```

Typha maintains one watch connection per resource type regardless of how many Felix agents are connected. When the API server sends an update, Typha fans it out to all connected Felix agents. This drastically reduces API server load and watch latency at scale.

---

## Step 3: Understand When Typha Is Needed

Typha is generally recommended when your cluster reaches approximately 50 or more nodes. Below that threshold, the direct Felix-to-API-server model works well. The Calico documentation suggests the following rough guidance:

- Under 50 nodes: Typha optional
- 50–200 nodes: 1–3 Typha replicas recommended
- 200+ nodes: 3+ Typha replicas strongly recommended

The "hard way" means you are responsible for deploying and sizing Typha yourself rather than delegating this to the Calico Operator's `Installation` CRD.

---

## Step 4: Understand the Typha Communication Protocol

Typha exposes a custom TCP-based protocol (not HTTP) on port 5473 by default. Felix connects to Typha using the `TYPHA_ADDR` or `FELIX_TYPHAADDR` environment variable. The connection is authenticated via mutual TLS when configured, which is recommended for production clusters.

You can inspect the current Typha configuration with:

```bash
# List Typha pods in the calico-system namespace
kubectl get pods -n kube-system -l k8s-app=calico-typha

# View Typha logs to confirm Felix connections
kubectl logs -n kube-system -l k8s-app=calico-typha --tail=50
```

---

## Step 5: Review the Felix-to-Typha Configuration

When Typha is running, Felix must be told to use it. In a manifest-based deployment, this is set via the Felix `ConfigMap` or `FelixConfiguration` resource:

```yaml
# felixconfiguration-typha.yaml
# Tell Felix to connect to Typha instead of the API server directly
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # The Typha service DNS name or IP that Felix should connect to
  typhaAddr: ""         # Leave empty; Felix auto-discovers via TYPHA_K8S_SERVICE_NAME
  typhaK8sServiceName: calico-typha   # Name of the Typha Kubernetes Service
  typhaK8sNamespace: kube-system      # Namespace where Typha runs
```

Apply with:

```bash
calicoctl apply -f felixconfiguration-typha.yaml
```

---

## Best Practices

- Never run Typha on the same nodes as Felix-heavy workloads; use node affinity to pin Typha to dedicated infra nodes.
- Always run at least two Typha replicas to avoid a single point of failure.
- Enable mutual TLS between Felix and Typha in production environments to prevent rogue agents from connecting.
- Use `PodDisruptionBudget` resources to ensure at least one Typha pod is always available during node maintenance.
- Monitor Typha connection counts with Prometheus metrics to detect Felix reconnection storms early.

---

## Conclusion

Typha is a critical scaling component for large Calico deployments. By understanding the architecture — a single API server watch fan-out to many Felix agents — you can make informed decisions about when to enable it and how many replicas to run. In subsequent posts in this series, you will deploy, configure, secure, and monitor Typha entirely from scratch without relying on the Calico Operator.

---

*Monitor your Kubernetes network health and Calico policy changes in real time with [OneUptime](https://oneuptime.com).*
