# Validation Summary: How to Troubleshoot API Server Unreachable on Talos Linux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes API server
- Kubernetes control plane static pods
- etcd
- talosctl
- kubectl
- TLS certificates
- Load balancers, VIPs, and firewall rules

## Sources Consulted
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux troubleshooting documentation: https://docs.siderolabs.com/talos/v1.11/troubleshooting/troubleshooting
- Talos Linux static pods documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/images-container-runtime/static-pods
- Talos Linux logging documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/logging-and-telemetry/logging
- Talos Linux static addressing documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/static
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes ports and protocols documentation: https://kubernetes.io/docs/reference/networking/ports-and-protocols/

## Issues Found
- The post treated `kube-apiserver` as a Talos service and used `talosctl service kube-apiserver` / `talosctl logs kube-apiserver`. On Talos, control plane components are static pods, and logs are retrieved from Kubernetes container IDs using `talosctl logs -k`. Updated the examples to use `talosctl get staticpodstatus`, `talosctl containers -k`, and `talosctl logs -k`.
- The API health-check examples used `/healthz`, which Kubernetes documents as deprecated since v1.16. Updated the checks to use `/readyz` for API server readiness and load-balancer validation.
- The firewall check suggested `talosctl -n <worker-ip> read /proc/net/tcp` as a connectivity test, but that only reads socket state and does not attempt a connection. Replaced it with an external `nc -vz <control-plane-endpoint> 6443` test and clarified that Talos does not provide a shell or iptables CLI.
- The post said network policy could block external traffic to the API server. Kubernetes NetworkPolicy is pod-focused, so the relevant controls here are firewall rules, security groups, or network ACLs. Updated the wording.
- The webhook section implied unreachable admission webhooks can make the API server fail to start. Unreachable admission webhooks normally affect API request admission after the API server is running; invalid API server arguments or config are the startup risk. Updated the wording and log commands.
- The static pod manifest command used `talosctl get staticpod kube-apiserver`; current Talos documentation shows the static pod resource as `staticpods` or its alias `sp`. Updated the command to `talosctl get staticpods kube-apiserver -o yaml`.
- The recovery procedure reset command omitted `--reboot`, while Talos reset otherwise shuts down by default. Added `--reboot` so the following `apply-config --insecure` step is reachable after reset.
- The connection-refused explanation was slightly imprecise. Updated it to distinguish reachable endpoints with no accepting listener or active rejection from silent drops/timeouts.

## Review Notes
The guide is technically relevant and useful. The recovery procedure remains intentionally destructive and should be treated as a last resort, especially for multi-node control planes where etcd membership and quorum must be considered carefully.
