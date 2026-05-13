# Validation Summary: Explaining Typha Upgrades in Calico the Hard Way

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico Typha
- Calico Felix / calico-node
- Kubernetes Deployments and rolling updates
- `kubectl`
- `calicoctl`
- Prometheus metrics

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Kubernetes upgrade guide: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico release notes: https://docs.tigera.io/calico/latest/release-notes/
- Calico calicoctl install guide: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post claimed a specific Calico minor-version compatibility example and recommended upgrading Typha before Felix. Tigera's current upgrade documentation describes applying the target manifest and rolling Calico workloads, while the calicoctl docs say to use a calicoctl version that matches the running cluster. I changed the wording to keep components in supported combinations and follow the official upgrade procedure and release notes.
- The rolling update example implied all reconnecting Felix clients necessarily land on the new Typha pod. In practice they reconnect to ready Typha endpoints, and the exact distribution depends on endpoint selection and rollout settings. I updated the example to say ready Typha pods receive reconnecting clients.
- The timing claims were stated as fixed typical ranges. Because reconnect and readiness timing depends on cluster load, API server responsiveness, and deployment strategy, I changed those numbers to an example estimate and advised measuring in the target cluster.
- The post said Felix reconnects using the Service DNS name. The official Felix configuration reference says `TyphaK8sServiceName` makes Felix look up the Endpoints of the configured Kubernetes Service. I corrected that wording.
- The post said Felix compares the reconnect snapshot and applies only the delta. The Typha docs state that Typha sends a snapshot and then follows with change lists; I changed the Felix-side wording to the safer statement that Felix reconciles its local dataplane to the received state and then processes subsequent updates.
- The release-notes command comment referred to a compatibility matrix and protocol-version verification. I changed it to checking target-version upgrade notes and inspecting Typha startup/client connection logs, which better matches the linked documentation and likely log output.

## Review Notes
- The `kubectl get ... -o jsonpath=...`, `kubectl logs --tail ... -f`, and `kubectl rollout status deployment/calico-typha -n kube-system` command shapes are consistent with Kubernetes CLI documentation, but `kubectl` and `calicoctl` were not available in this local workspace for live help verification.
- `typha_connections_active` is a documented Typha Prometheus metric, although the Typha metrics documentation notes that some metrics are tied to implementation details and are not guaranteed to persist unchanged across releases.
