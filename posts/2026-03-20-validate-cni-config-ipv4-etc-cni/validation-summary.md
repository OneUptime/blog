# Validation Summary: How to Validate CNI Configuration Files for IPv4 in /etc/cni/net.d

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Kubernetes CNI (Container Network Interface)
- Flannel CNI plugin
- Calico CNI plugin
- containerd / CRI-O runtime
- Python 3 `json` module
- Linux shell / kubectl
- `/etc/cni/net.d/` and `/opt/cni/bin/`

## Sources Consulted
- CNI specification (containernetworking/cni): https://github.com/containernetworking/cni/blob/main/SPEC.md
- CNI plugins repository: https://github.com/containernetworking/plugins
- Flannel CNI plugin documentation: https://github.com/flannel-io/cni-plugin (and the default `10-flannel.conflist` shipped in kube-flannel manifests)
- Calico installation / CNI config reference: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Kubernetes network plugins docs: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Python 3 `json` module docs: https://docs.python.org/3/library/json.html (verified that invalid JSON raises `json.JSONDecodeError`, a subclass of `ValueError`, not `SyntaxError`)
- containerd CRI plugin CNI handling (first alphabetical config used, `.conflist` preferred)

## Issues Found
- **Incorrect Python exception name.** The post claimed invalid JSON produces a `SyntaxError` from `json.load`. Python's `json` module actually raises `json.JSONDecodeError` (a subclass of `ValueError`). Verified by running `python3 -c "import json; json.loads('{invalid}')"`. Updated the comment in the validation snippet to read `json.decoder.JSONDecodeError = invalid JSON`.

## Review Notes
- The Flannel `cbr0` config with `cniVersion` `0.3.1`, `delegate.hairpinMode`, `isDefaultGateway`, and chained `portmap` matches the canonical kube-flannel manifest.
- The Calico snippet is a trimmed "key fields" view; real `10-calico.conflist` files usually chain additional plugins (e.g. `bandwidth`, `portmap`) and include fields like `mtu`, `container_settings`, `policy_setup_timeout_seconds`. The abbreviation is reasonable given the post frames it as "Key fields to check."
- `cniVersion: 0.3.1` is still widely shipped by Flannel/Calico defaults, but newer CNI spec versions (`1.0.0`, `1.1.0`) are supported by modern runtimes; readers upgrading plugins may see higher versions.
- Running a CNI binary directly (`/opt/cni/bin/flannel 2>&1 | head -3`) only verifies it executes — CNI binaries expect JSON on stdin plus `CNI_*` env vars, so output will typically be an error message about missing configuration. That's fine for a liveness smoke test but worth understanding.
- The statement that containerd/CRI-O re-read CNI configs on each new container creation is accurate; no daemon restart is needed after editing `/etc/cni/net.d/`.
- File ordering claim ("10 sorts before 20", first valid file wins, `.conflist` preferred over `.conf`) matches current containerd CRI plugin behavior.
