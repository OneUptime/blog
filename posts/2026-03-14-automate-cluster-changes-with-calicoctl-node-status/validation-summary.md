# Validation Summary: Automating Cluster Monitoring with calicoctl node status

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico
- calicoctl
- BGP
- Kubernetes CronJob
- Bash scripting
- Prometheus text exposition format

## Sources Consulted
- Calico `calicoctl node status` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl node` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico `calicoctl` installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Prometheus exposition format documentation: https://prometheus.io/docs/instrumenting/exposition_formats/
- Local Docker verification of `calico/ctl:v3.32.0` command behavior

## Issues Found
- The scripts attempted to run `calicoctl node status` inside `calico-node` pods. Official Calico documentation states that `calicoctl node` commands must run on the compute host/local Calico node context, and local Docker inspection of `calico/node:v3.27.0` showed that the image does not include `calicoctl`. Updated the scripts to run `sudo calicoctl node status` locally or over SSH to the target node.
- Peer counting only matched `node-to-node` and `global` peer types. Official Calico BGP examples also show `node specific` peers. Updated peer-counting expressions to include `node specific`.
- The Kubernetes CronJob used `calico/ctl:v3.27.0` with `/bin/sh`, but the `calico/ctl` image is minimal and does not include `/bin/sh`. Updated the manifest to invoke the image entrypoint directly with `args: ["node", "status"]`, added a `/var/run/calico` hostPath mount for local Calico node state, and updated the image tag to the current documented Calico version.
- The Prometheus exporter used `grep -c ... || echo 0`, which can produce duplicate `0` output when no matches are found because `grep -c` prints `0` before returning a non-zero status. Changed these commands to use `|| true`.
- The Prometheus exporter returned raw metrics over TCP without an HTTP status line or content type. Prometheus scrapes HTTP endpoints and documents `text/plain; version=0.0.4` as the text exposition content type. Updated the netcat response to include an HTTP 200 response and Prometheus text content type.
- Troubleshooting guidance still referred to `kubectl exec` after the scripts were corrected. Updated it to refer to hostPath permissions and SSH timeouts.

## Review Notes
The CronJob example reports status for the node where the pod is scheduled. For full cluster coverage, use the SSH-based cluster script shown earlier in the post or deploy a per-node workload such as a DaemonSet.
