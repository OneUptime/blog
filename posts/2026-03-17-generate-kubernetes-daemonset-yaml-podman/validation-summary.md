# Validation Summary: How to Generate a Kubernetes DaemonSet YAML with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Kubernetes
- DaemonSet
- Service
- YAML
- kubectl
- Alpine Linux

## Sources Consulted
- Podman official documentation: `podman-kube-generate(1)` - https://docs.podman.io/en/latest/markdown/podman-kube-generate.1.html
- Podman official documentation: `podman-kube(1)` - https://docs.podman.io/en/v4.4/markdown/podman-kube.1.html
- Kubernetes official documentation: DaemonSet - https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/

## Issues Found
- The post used the older `podman generate kube` command form. Current Podman documentation lists the command as `podman kube generate`, so all examples and the summary command were updated.
- The example generated DaemonSet name and selector labels did not match Podman's documented naming pattern for generated workload YAML from containers. The example and verification commands were updated to use `node-exporter-pod-daemonset` and `app=node-exporter-pod`.
- The Service explanation said the Service lets you access the agent on any node. Podman's `--service` option generates a Kubernetes Service and, when port mappings exist, may generate a NodePort service with a random node port. The wording was tightened to avoid implying per-node targeting behavior.
- The Alpine network-agent example used `ss`, but the base Alpine image does not include the `ss` command by default. The command now installs `iproute2` before running `ss`.

## Review Notes
The generated YAML may still need cluster-specific hardening before production use, especially for hostPath mounts, privileged containers, host networking, Service exposure, and SELinux environments. Podman notes SELinux-specific handling may be required for generated YAML from rootless containers with volumes.
