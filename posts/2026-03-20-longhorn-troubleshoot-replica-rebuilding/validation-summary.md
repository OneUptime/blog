# Validation Summary: How to Troubleshoot Longhorn Replica Rebuilding Loops

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- `kubectl`
- Longhorn custom resources (`Volume`, `Replica`, `Engine`, `Setting`)

## Sources Consulted
- Longhorn replica rebuilding docs: https://longhorn.io/docs/latest/advanced-resources/rebuilding/
- Longhorn settings reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn volume and replica conditions: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/volume-conditions/
- Longhorn troubleshooting docs: https://longhorn.io/docs/latest/troubleshoot/troubleshooting/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Longhorn v1.11.1 deploy manifest and CRD schema: https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/deploy/longhorn.yaml
- Longhorn manager API model (`rebuildStatus` on volume API responses): https://github.com/longhorn/longhorn-manager/blob/v1.11.1/api/model.go
- Longhorn manager image definition: https://github.com/longhorn/longhorn-manager/blob/v1.11.1/package/Dockerfile
- Longhorn manager label/type definitions (`longhornvolume`, instance-manager labels): https://github.com/longhorn/longhorn-manager/blob/v1.11.1/types/types.go

## Issues Found
- The replica state table listed `Rebuilding`, `Failed`, and `Deleted` as replica runtime states, but current Longhorn replica `status.currentState` uses states such as `running`, `starting`, `stopping`, `stopped`, `error`, and `unknown`. I replaced the table with the actual runtime states from the current Longhorn API/schema.
- The rebuild progress example executed `curl` inside a `longhorn-manager` pod. The current official manager image definition does not install `curl`, so the example was unreliable. I changed the example to use `kubectl port-forward` to `svc/longhorn-backend` and query the Longhorn API locally.
- The instance-manager log example selected an arbitrary instance-manager pod on a target node. That can miss the actual replica process. I changed it to read `status.instanceManagerName` from the replica and then fetch logs from that exact pod.
- The disk-space debug example checked `/var/lib/longhorn` directly from a node debug pod. Kubernetes documents that the host filesystem is mounted at `/host` for `kubectl debug node/...`, so I corrected the path to `/host/var/lib/longhorn`.
- The network troubleshooting section claimed Longhorn replicas communicate on port `8503`. In current Longhorn, replica runtime ports are exposed via replica status and engine runtime addresses, while `8503` is the instance-manager instance service port. I changed the section to query the replica's actual `status.ip` and `status.port` and test connectivity against those values.
- The `replica-replenishment-wait-interval` setting was described as a replica rebuild timeout. Longhorn documents it as the interval to wait before creating a replacement replica so a failed replica can potentially be reused. I corrected that description.
- The final disk-space best-practice used an unsupported fixed `30%` threshold. I updated it to reference Longhorn's documented `storage-minimal-available-percentage` threshold, which defaults to `25%`.

## Review Notes
The review was validated against current official Longhorn documentation and source as of 2026-04-29, which reflects Longhorn v1.11.1 as the latest release. The replica rebuilding workflow documentation is written primarily for the v1 data engine; the commands retained in the post were checked against current Longhorn CRDs and API behavior. `kubectl debug` examples also assume the cluster enables node debugging and that the operator has sufficient privileges to run those debug pods.
