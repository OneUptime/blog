# Validation Summary: How to Configure Discovery for Air-Gapped Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7.x)
- Talos discovery service (`ghcr.io/siderolabs/discovery-service`)
- Kubernetes (registry-based discovery, KubeSpan)
- talosctl CLI
- Container registries / image mirroring for air-gapped deployments
- TLS / internal CA configuration

## Sources Consulted
- Talos cluster discovery documentation: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/system-configuration/discovery
- Talos KubeSpan documentation: https://docs.siderolabs.com/talos/v1.7/networking/kubespan/
- Talos v1.7 configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Discovery service source: https://github.com/siderolabs/discovery-service (`cmd/discovery-service/main.go` for flag defaults)
- Talos source (v1.7.5): `pkg/machinery/resources/cluster/member.go`, `pkg/machinery/resources/cluster/affiliate.go`, `pkg/machinery/resources/kubespan/peer_status.go`, `cmd/talosctl/cmd/talos/image.go`
- Talos v1.7.0 GitHub release assets (via api.github.com): confirmed ISO is `metal-amd64.iso`

## Issues Found
1. **Wrong Talos ISO filename.** The post used `talos-amd64.iso` in the `wget` example. The actual asset published on the v1.7.0 GitHub release is `metal-amd64.iso`. Fixed by renaming the file in the download URL.
2. **Non-existent `talosctl images` flag.** The post invoked `talosctl images --kubernetes-version 1.29.0`. The `image`/`images` command does not accept a `--kubernetes-version` flag; the subcommand that lists the default images Talos uses is `talosctl image default` (it uses the Kubernetes version baked into the talosctl binary). Replaced the line with `talosctl image default > required-images.txt` and updated the comment.
3. **Wrong COSI resource name for cluster members.** The post used `talosctl get discoveredmembers`. The Talos resource for discovered cluster members is `Members.cluster.talos.dev`. Replaced with `talosctl get members`.
4. **Wrong COSI resource name for KubeSpan peer status.** The post used `talosctl get kubespanpeerstatus` (singular). The resource type is `KubeSpanPeerStatuses.kubespan.talos.dev` and the documented `talosctl get` form is plural. Replaced with `talosctl get kubespanpeerstatuses`.

## Review Notes
- The post's recommended Option 1 (Kubernetes registry only) is functional in Talos v1.7, but the Kubernetes-based discovery registry is marked deprecated upstream and is disabled by default in v1.7; it is also incompatible with Kubernetes 1.32+ in its default configuration. Future revisions may want to flag this and steer readers toward a self-hosted discovery service for new deployments.
- The discovery service's `-addr` flag accepts the syntax shown (`--addr=:3000`) because the Go `flag` package treats single- and double-dash variants identically. The default is already `:3000`, so the flag is redundant but harmless. TLS in the discovery service is optional (`-certificate-path` / `-key-path`); Talos clients, however, expect an `https://` endpoint, so the post's guidance to terminate TLS at an Ingress or LoadBalancer is correct.
- The post does not call out that operating a self-hosted Sidero Labs discovery service in production requires a commercial license per the upstream documentation. Worth mentioning in a future revision.
- `talosctl etcd snapshot <path> --nodes <ip>` is correct — `<path>` is a positional argument and `etcd snapshot` enforces single-node execution.
- `talosctl gen secrets -o <path>` is correct (`-o` is the short form of `--output-file`).
