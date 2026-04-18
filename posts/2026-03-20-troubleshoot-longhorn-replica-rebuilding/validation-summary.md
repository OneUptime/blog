# Validation Summary: How to Troubleshoot Longhorn Replica Rebuilding

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Kubernetes (kubectl, CRDs: volumes.longhorn.io, replicas.longhorn.io, nodes.longhorn.io, settings.longhorn.io)
- Linux diagnostic tooling (dmesg, journalctl, smartctl, iptables, nc, ping)
- jq for JSON filtering
- Bash scripting

## Sources Consulted
- [Longhorn Networking Reference (v1.11.1)](https://longhorn.io/docs/1.11.1/references/networking/) — verified that the Longhorn Manager listens on TCP 9500 and instance managers use TCP 10000-30000 for engine/replica data communication (not 9500-9520)
- [Longhorn Settings Reference (v1.11.1)](https://longhorn.io/docs/1.11.1/references/settings/) — verified default of `concurrent-replica-rebuild-per-node-limit` is 5
- [Longhorn Replica Rebuilding (v1.11.1)](https://longhorn.io/docs/1.11.1/advanced-resources/rebuilding/) — verified rebuild flow and terminology
- [longhorn-manager types package](https://pkg.go.dev/github.com/longhorn/longhorn-manager/types) — cross-checked setting names and defaults
- GitHub discussions confirming `longhornvolume` label selector usage on `replicas.longhorn.io`

## Issues Found
- **Incorrect replica port claim.** The post originally stated "Longhorn uses ports 9500-9520 for replica communication" and asked the reader to test port 9502. Per the official networking reference, port 9500/TCP is the Longhorn Manager API port; engine/replica data ports are dynamically allocated from the 10000-30000 TCP range by instance managers. Fixed the connectivity test to probe 9500 and updated the firewall comment and `iptables` grep to reference 9500 and the 10000-30000 dynamic range.

## Review Notes
- `kubectl get nodes.longhorn.io -n longhorn-system | grep -v true` in the "Rebuild Not Starting" section is a rough filter — it will also strip the header row and any nodes whose names happen to contain "true". Functional but coarse; left as-is since it is not technically wrong.
- The default for `storage-over-provisioning-percentage` is currently 100 (older Longhorn releases shipped 200). The post's recommendation to patch it to 300 is a valid operational knob, though readers on stricter clusters should be aware of the implications before over-provisioning this aggressively.
- The `longhornvolume` label selector and the `replicas.longhorn.io` / `volumes.longhorn.io` / `nodes.longhorn.io` / `settings.longhorn.io` CRD names are correct.
- The robustness field values (`healthy`, `degraded`, `faulted`, `unknown`) are lowercase as used in the post.
- Deleting a stuck replica (`kubectl delete replica.longhorn.io ...`) to trigger a fresh rebuild is a documented Longhorn workflow; the controller will reconcile a replacement.
- The detach-by-patching-`spec.nodeID`-to-empty-string trick is a recognized Longhorn pattern for forcing a volume to re-evaluate state.
