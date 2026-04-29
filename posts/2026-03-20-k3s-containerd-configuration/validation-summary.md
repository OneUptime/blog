# Validation Summary: How to Configure K3s to Use containerd - Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- containerd
- Kubernetes RuntimeClass
- CRI / crictl
- Private container registries
- NVIDIA Container Runtime

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Private Registry Configuration: https://docs.k3s.io/installation/private-registry
- K3s CLI Tools: https://docs.k3s.io/cli
- K3s agent CLI reference: https://docs.k3s.io/cli/agent
- containerd CRI config guide: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- containerd CRICTL user guide: https://containerd.io/docs/2.1/cri/crictl/

## Issues Found
- The post treated `/var/lib/rancher/k3s/agent/etc/containerd/config.toml.tmpl` as the primary template path. Current K3s releases bundle containerd 2.0 and prefer `config-v3.toml.tmpl` for config version 3, so I added the current template path and reclassified `config.toml.tmpl` as the legacy version 2 template.
- The custom template example used a partial version 2 config. Current K3s guidance is to extend the K3s base template or provide a full template based on K3s defaults, not a partial copy of the rendered config. I replaced the example with the documented base-template pattern for containerd 2.0.
- The registry TLS comment said to skip verification, but the example set `insecure_skip_verify: false`. I corrected the comment so it matches the actual configuration.
- The registry mirror text implied full redirection. K3s documents that containerd still falls back to the default registry endpoint unless `--disable-default-registry-endpoint` is set, so I added that caveat.
- The restart command only covered the `k3s` service. Runtime and registry changes also apply on agent nodes, where the service is `k3s-agent`, so I updated the command example to cover both.
- The NVIDIA section instructed readers to manually add an `nvidia` runtime and create a `RuntimeClass`. Current K3s documentation says K3s auto-detects supported alternative runtimes, adds the matching containerd configuration, and already ships the RuntimeClass definitions. I changed the section to verification plus usage of the bundled `nvidia` RuntimeClass.

## Review Notes
- The post is now accurate for current K3s releases as of 2026-04-29, but this area is version-sensitive because K3s moved to containerd 2.0 in the February 2025 release line and now prefers config version 3 templates.
- `k3s crictl info | jq -r '.config.containerdEndpoint'` is valid, but it assumes `jq` is installed on the node.
