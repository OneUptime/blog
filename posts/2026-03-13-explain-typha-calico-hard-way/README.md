# How to Explain Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Architecture, Communication

Description: How to explain Typha's architecture, purpose, and operation to teammates unfamiliar with large-scale Calico deployments.

---

## Introduction

Explaining Typha to teammates who are familiar with Kubernetes but not with Calico internals requires grounding the explanation in concepts they already know: watchers, API server load, and fan-out patterns. The core message is that Typha is a caching proxy that makes Calico scale efficiently in large clusters by reducing the number of watch connections to the Kubernetes API server.

## The Problem Typha Solves

In a standard Kubernetes setup, controllers watch the API server for resource changes. Calico's Felix daemon runs on every node and watches for NetworkPolicy, IPPool, and node resource changes. In a 200-node cluster, that means 200 concurrent watch connections to the API server, each processing the same stream of events independently.

This is analogous to 200 developers each refreshing a documentation page every second - the server has to respond to all 200 individually, even though the content is the same. A content delivery network (CDN) solves this by caching the content and serving it to all 200 developers from the cache.

Typha is Calico's CDN equivalent: it holds one watch connection to the API server, caches the current state of Calico resources, and fans it out to all Felix agents.

## The Coalescing Benefit

Beyond reducing connection count, Typha also coalesces rapid updates. If a NetworkPolicy is updated five times in two seconds (as might happen during a rollout), Felix without Typha would reprogram iptables five times per node. With Typha, only the final state is delivered to Felix, resulting in one iptables reprogram per node.

This matters most in large clusters during policy rollouts or when automation tools apply many policy changes rapidly.

## Analogy for Teams

A useful analogy for engineering teams:

> "Typha is to Calico's Felix agents what a message broker is to microservices. Instead of each service subscribing directly to a database change stream (high load), they subscribe to a broker (Typha) that fans out updates from a single source subscription."

## How Felix Connects to Typha

In a hard way installation, Felix connects to Typha using a configuration parameter.

```bash
# In Felix configuration (/etc/calico/felix.cfg or FelixConfiguration)
TyphaAddr = typha-service.calico-system.svc.cluster.local:5473
```

Felix opens a persistent TCP connection to Typha on port 5473. Typha authenticates Felix using mTLS certificates.

## Typha's Resource Consumption

Each Typha replica handles a configurable number of Felix connections. The recommended ratio is approximately 200 Felix connections per Typha replica.

```bash
# Check current Typha connection count
kubectl exec -n calico-system deployment/calico-typha -- \
  wget -qO- http://localhost:9093/metrics | grep typha_connections_accepted
```

## RBAC Requirements

Typha needs read access to Calico and Kubernetes resources.

```bash
kubectl get clusterrolebinding | grep typha
kubectl get clusterrole calico-typha -o yaml | grep -A5 rules
```

## Deployment Model

In hard way installations, Typha runs as a Deployment (not a DaemonSet). Typically 1-3 replicas are sufficient for clusters up to 3000 nodes.

```bash
kubectl get deployment -n calico-system calico-typha
```

## Conclusion

Explaining Typha effectively means connecting it to familiar patterns: caching proxies, message brokers, and CDNs. The core message is that Typha exists to prevent N×M API server load (N nodes times M resource types) from degrading Kubernetes API server performance in large clusters. In hard way installations, this understanding directly informs how to deploy, scale, and monitor Typha as a first-class component of the Calico architecture.
