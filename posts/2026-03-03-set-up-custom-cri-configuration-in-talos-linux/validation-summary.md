# Validation Summary: How to Set Up Custom CRI Configuration in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- containerd
- Container Runtime Interface (CRI)
- Kubernetes RuntimeClass
- CNI configuration
- talosctl

## Sources Consulted
- Talos Linux containerd configuration documentation: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/images-container-runtime/containerd
- Talos Linux 1.3 CRI configuration override change note: https://www.talos.dev/v1.3/introduction/what-is-new/
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- containerd 2.1 CRI configuration documentation: https://containerd.io/docs/2.1/cri/config/
- Kubernetes RuntimeClass documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes CRI streaming explanation: https://kubernetes.io/blog/2024/05/01/cri-streaming-explained/

## Issues Found
- The post used the obsolete Talos CRI override path `/var/cri/conf.d/*.toml`. Talos removed support for `/var/cri/conf.d` overrides in Talos 1.3, and current documentation uses `/etc/cri/conf.d/*.part`, so all paths and troubleshooting commands were updated.
- The post described the final generated config as `/etc/containerd/config.toml`. Talos' CRI containerd config is generated at `/etc/cri/containerd.toml`, so the architecture and verification commands were corrected.
- The examples used containerd 1.x CRI plugin tables such as `[plugins."io.containerd.grpc.v1.cri".containerd]` for runtime, image, and CNI settings. These were updated to the containerd 2.x tables such as `io.containerd.cri.v1.images` and `io.containerd.cri.v1.runtime`.
- The sandbox image examples used the old `sandbox_image` field. Current containerd 2.x configuration uses `[plugins."io.containerd.cri.v1.images".pinned_images] sandbox`, so those examples were updated.
- The image service example configured deprecated CRI registry mirror tables directly and used `discard_unpacked_layers = true`, which is incompatible with containerd 2.1 transfer-service pulls. The example was simplified to current image settings, and the text now directs readers to Talos `machine.registries.mirrors`.
- The runtime example used a Spin runtime type without establishing that Talos includes the required runtime. It was replaced with the official containerd-documented Kata runtime example, and the RuntimeClass was updated accordingly.
- The pod sandbox example used `sandbox_mode = "podsandbox"`, which is not a current containerd 2.x runtime option. The unsupported setting was removed.
- The streaming section incorrectly included `kubectl logs` as a CRI streaming-server operation. It now lists `kubectl exec`, `kubectl attach`, and `kubectl port-forward`.
- The troubleshooting command used `talosctl list`. Talos documentation and examples use `talosctl ls` for filesystem listing, so the command was corrected.

## Review Notes
The corrected examples target current Talos/containerd 2.x behavior. Runtime handlers such as gVisor and Kata still require the corresponding runtime binaries/extensions to be present on the Talos nodes before RuntimeClass workloads can run successfully.
