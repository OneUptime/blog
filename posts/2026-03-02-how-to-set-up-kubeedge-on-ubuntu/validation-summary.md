# Validation Summary: How to Set Up KubeEdge on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- KubeEdge (v1.17.0)
- Kubernetes
- keadm (KubeEdge admin tool)
- CloudCore / EdgeCore
- EdgeMesh
- Helm
- Ubuntu 22.04
- kubectl
- systemd / journalctl

## Sources Consulted
- Official KubeEdge keadm installation guide: https://kubeedge.io/docs/setup/install-with-keadm
- KubeEdge GitHub release page for v1.17.0: https://github.com/kubeedge/kubeedge/releases/tag/v1.17.0
- keadm gettoken source code (release-1.17): https://github.com/kubeedge/kubeedge/blob/release-1.17/keadm/cmd/keadm/app/cmd/cloud/gettoken.go
- EdgeMesh Helm install README: https://github.com/kubeedge/edgemesh/blob/main/build/helm/edgemesh/README.md
- EdgeMesh getting started guide: https://edgemesh.netlify.app/guide/
- Verified release asset URL via HTTP HEAD request

## Issues Found

1. **Missing `v` prefix on `--kubeedge-version` flag.** The post used `--kubeedge-version=1.17.0` in both the `keadm init` and `keadm join` commands. Per the official KubeEdge documentation, this flag requires the `v` prefix (e.g., `v1.17.0`). Fixed both occurrences to `--kubeedge-version=v1.17.0`.

2. **Non-existent `--force` flag on `keadm gettoken`.** The Security Considerations section recommended rotating the registration token with `keadm gettoken --force`. Inspecting the v1.17 source (`keadm/cmd/keadm/app/cmd/cloud/gettoken.go`) confirms only a `--kube-config` flag is registered for that subcommand. Rewrote the bullet to reference regenerating the token via `keadm gettoken` after adjusting the CloudCore token TTL configuration, which is the actual mechanism.

3. **Wrong EdgeMesh Helm chart filename.** The post linked to `edgemesh.tar.gz`, which returns HTTP 404. The chart is published as `edgemesh.tgz` per the EdgeMesh Helm README, and that URL returns HTTP 200. Updated the URL accordingly.

## Review Notes
- The `keadm` download URL (`keadm-v1.17.0-linux-amd64.tar.gz`) was verified to exist on GitHub releases (HTTP 200).
- Ports referenced (10000 for cloudhub websocket, 10002 for the cloudhub HTTPS endpoint used in the troubleshooting `curl` check) match the official documentation.
- The EdgeMesh `helm install` example is simplified — the official chart README typically also recommends setting `agent.relayNodes[0].nodeName` and `agent.relayNodes[0].advertiseAddress` for relay nodes. The simplified form will still install the chart, so this is acceptable for a basic walkthrough but could be expanded in a future revision.
- The example `kubectl get nodes` output shows `v1.28.6-kubeedge-v1.17.0` for the edge node — KubeEdge v1.17.0 is compatible with Kubernetes 1.27/1.28 series, so this is plausible.
- The post assumes the user has already installed Kubernetes via kubeadm; this is called out in Prerequisites but no link is provided to a setup guide.
