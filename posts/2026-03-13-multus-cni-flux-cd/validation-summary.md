# Validation Summary: How to Deploy Multus CNI with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Multus CNI (v4.0.2) — meta-CNI plugin for multi-NIC pods
- Kubernetes (DaemonSets, NetworkAttachmentDefinitions, Pod annotations)
- Flux CD (GitRepository, Kustomization — `source.toolkit.fluxcd.io/v1`, `kustomize.toolkit.fluxcd.io/v1`)
- CNI plugins: macvlan, ipvlan
- IPAM plugins: host-local, static
- kubectl

## Sources Consulted
- Multus CNI repo: https://github.com/k8snetworkplumbingwg/multus-cni (v4.0.2 release, `deployments/` directory)
- Multus quickstart docs: https://github.com/k8snetworkplumbingwg/multus-cni/blob/master/docs/quickstart.md
- Network Plumbing WG spec for `k8s.v1.cni.cncf.io/networks` annotation: https://github.com/k8snetworkplumbingwg/multi-net-spec
- CNI specification (config is strict JSON): https://github.com/containernetworking/cni/blob/main/SPEC.md
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Source GitRepository docs: https://fluxcd.io/flux/components/source/gitrepositories/
- CNI macvlan/ipvlan plugin docs: https://www.cni.dev/plugins/current/main/macvlan/, https://www.cni.dev/plugins/current/main/ipvlan/

## Issues Found

1. **Invalid JSON comments inside CNI configuration (Step 2)** — Both `NetworkAttachmentDefinition` configs embedded `#`-style comments inside the JSON payload (e.g., `"master": "eth1", # Secondary NIC on the node`). The CNI specification mandates strict JSON, which does not allow comments, so Multus would fail to parse the config. Moved the explanatory text out into a YAML comment above the resource.

2. **Invalid JSON comments inside pod annotation (Step 3)** — The `k8s.v1.cni.cncf.io/networks` annotation likewise contained inline `#` comments inside the JSON array. Multus parses this annotation as JSON and would error. Moved the explanatory text into the YAML annotation comment block.

3. **Flux Kustomization `spec.path` pointed at a single YAML file (Step 1)** — The Flux Kustomize controller requires `spec.path` to be a directory (it expects to find a `kustomization.yaml` there or auto-generate one from the YAMLs in the directory; it does not accept a single-file path). Changed `./deployments/multus-daemonset.yml` to `./deployments` and updated the inline comment accordingly.

4. **Custom DaemonSet referenced the `-thick` image but omitted required components (Step 1 alternative)** — The `v4.0.2-thick` image variant requires a `multus-daemon-config` ConfigMap mount, the `install-multus-binary` init container that places the shim into `/opt/cni/bin`, and additional volume mounts (`/run/multus`, `/var/lib/cni/multus`, `/run/k8s.cni.cncf.io`, `/run/netns/`, chroot mount). The DaemonSet shown had none of these and would not function. Changed the image tag to the standard (thin) `v4.0.2` variant and removed the `command: ["/usr/src/multus-cni/bin/multus-daemon"]` line so the upstream entrypoint runs and installs the CNI plugin via the existing host-path volumes.

## Review Notes
- The custom DaemonSet alternative is still a simplified excerpt — readers wanting a production-ready manifest should pull the upstream `deployments/multus-daemonset.yml` (or the thick variant with its full set of volumes and ConfigMap). The post's primary path (Flux `GitRepository` → upstream multus repo) is the recommended approach and is correct.
- CNI `cniVersion: 0.3.1` is a valid version supported by both macvlan and ipvlan plugins; Multus also supports 0.4.0 and 1.0.0 if a newer CNI library is needed.
- Flux v2 GA APIs (`source.toolkit.fluxcd.io/v1`, `kustomize.toolkit.fluxcd.io/v1`) are correct.
- The `static` IPAM with an empty `addresses` array in the NetworkAttachmentDefinition combined with per-pod `ips` in the annotation is the documented pattern for assigning per-pod static IPs and is correct.
- The verification command `kubectl exec -n production deployment/nfv-router -- ip addr show` assumes the container image has `ip` (iproute2); some minimal images may need `ip a` via a debug container instead. Not changed — this is an environmental caveat, not an error.
