# Validation Summary: How to Configure K3s for Intermittent Connectivity

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- CoreDNS
- OCI container registries
- RabbitMQ
- Bash

## Sources Consulted
- K3s CLI Tools: https://docs.k3s.io/cli
- K3s Private Registry Configuration: https://docs.k3s.io/installation/private-registry
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Kubelet Configuration (v1beta1): https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes Annotations: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/

## Issues Found
- The certificate-renewal challenge was too broad. K3s internal certificate handling does not inherently depend on internet access, so the post now correctly scopes the claim to external ACME or CA-backed renewal workflows.
- The local registry example used a `NodePort` plus `localhost:30500` mirror setup that is not a reliable general K3s registry pattern. It was changed to a single-node example that exposes the registry with `hostPort: 5000` and uses a direct registry endpoint in `registries.yaml`.
- The `apps/v1` Deployment example for `offline-first-app` was invalid because it omitted the required `.spec.selector` and matching pod template labels. Those fields were added.
- The RabbitMQ StatefulSet example was incomplete. A StatefulSet requires a governing Service, plus `serviceName`, `selector`, and matching pod labels. The post now includes a headless Service and the required StatefulSet fields so the DNS names used elsewhere in the post are valid.
- The timeout-tuning example mixed component settings incorrectly. `node-monitor-grace-period` is a controller-manager setting, not a kubelet flag, and `pod-eviction-timeout` is no longer a current kube-controller-manager CLI flag. The post now uses `kube-controller-manager-arg` for `node-monitor-grace-period` and a kubelet config drop-in for `nodeLeaseDurationSeconds`.
- The CoreDNS example replaced the managed `coredns` ConfigMap directly from the K3s manifests directory, which is not K3s’s supported customization path. It was changed to a `coredns-custom` ConfigMap using the documented `*.override` import mechanism.
- The connectivity script used plain `curl`, `kubectl`, and an unprefixed annotation key. It now uses `curl -f` semantics for HTTP failure detection, `k3s kubectl` for the K3s-bundled client, and a DNS-prefixed annotation key suitable for automation.

## Review Notes
- The registry example is now explicitly scoped to a single-node edge cluster. Multi-node edge clusters would usually benefit from a registry address reachable from every node or K3s's embedded distributed registry mirror.
- The kubelet drop-in example depends on K3s v1.32 or later, which is when K3s added support for kubelet config file and drop-in management.
- The examples still use `hostPath` volumes for simplicity. That is valid, but less portable than using PersistentVolumeClaims backed by an appropriate storage class.
