# Validation Summary: How to Configure K3s for Retail Store Edge Computing - Computing

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes Deployments
- Kubernetes CronJobs
- Kubernetes Services
- Kubernetes `hostPath` volumes
- Kubernetes security contexts
- Rancher Fleet

## Sources Consulted
- K3s configuration options: https://docs.k3s.io/installation/configuration
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s private registry configuration: https://docs.k3s.io/installation/private-registry
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes volumes (`hostPath`): https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Downward API: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes Linux kernel security constraints / privileged containers: https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/
- SUSE Rancher Fleet `fleet.yaml` targeting reference: https://documentation.suse.com/cloudnative/continuous-delivery/v0.14/en/reference/ref-fleet-yaml.html

## Issues Found
- The `pos-service` Deployment was invalid because `apps/v1` Deployments require `.spec.selector.matchLabels` to match `.spec.template.metadata.labels`. I added the missing pod-template labels.
- The POS example used `postgresql://localhost:5432/pos` while also showing two Deployment replicas. `localhost` inside a pod only reaches that pod's own network namespace, not a separate database pod or service. I changed the example to use a Kubernetes Service DNS name.
- The `hostPath` examples for transaction and registry data did not specify creation behavior. I changed both to `type: DirectoryOrCreate` so the example works on a fresh node without pre-creating directories.
- The registry section deployed a registry pod but did not expose it in a way K3s nodes could pull from, and it omitted the required `registries.yaml` configuration for a non-TLS HTTP registry. I added a `NodePort` Service and the matching `/etc/rancher/k3s/registries.yaml` example, updated the image references to match, and tightened the section wording so it matches the commands shown.
- The hardware access example explicitly set `privileged: false`, which can prevent direct access to host devices. I changed it to `privileged: true` for the device-access example because Kubernetes documents privileged containers as the mechanism for workloads that need access to hardware devices.

## Review Notes
- The K3s `kubelet-arg` settings shown in Step 1 are still supported by K3s, but upstream kubelet documents many of those command-line flags as deprecated in favor of kubelet config files. K3s v1.32+ also supports kubelet config drop-ins, so that may be a cleaner long-term pattern.
- The Fleet guidance is technically sound: `targetCustomizations.clusterSelector` supports label-based targeting for store-specific rollouts.
