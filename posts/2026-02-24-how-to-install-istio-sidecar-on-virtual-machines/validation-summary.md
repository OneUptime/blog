# Validation Summary: How to Install Istio Sidecar on Virtual Machines

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Istio sidecar mode
- Istio virtual machine integration
- Envoy proxy
- istioctl
- WorkloadGroup and WorkloadEntry
- Linux systemd
- iptables
- Debian packages and RPM packages

## Sources Consulted
- Istio Virtual Machine Installation: https://istio.io/latest/docs/setup/install/virtual-machine/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Virtual Machines: https://istio.io/latest/docs/ops/diagnostic-tools/virtual-machines/
- Istio 1.30 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/

## Issues Found
- The bootstrap command used `istioctl x workload entry configure --serviceAccount`, but the current `configure` command does not support `--serviceAccount`. I changed the example to define a `WorkloadGroup` containing the service account and pass it with `-f workloadgroup.yaml`, which matches the official VM installation workflow.
- The bootstrap example used `--autoregister` but did not apply the `WorkloadGroup` to the cluster first or mention that the feature must be enabled in Istiod. I added `kubectl --namespace vm-apps apply -f workloadgroup.yaml` and a caveat about enabling WorkloadEntry autoregistration.
- The package examples used Istio `1.20.0`, which is outdated for a post being validated on 2026-05-21. I updated the examples to `1.30.0`, the current release in the official Istio documentation.
- The RPM section claimed CentOS/RHEL/Amazon Linux coverage, while the official Istio VM installation guide specifically notes CentOS 8 support for the RPM package. I narrowed the heading and added the support note.
- The VM file placement steps omitted creation and ownership of `/etc/istio/proxy`, and only changed ownership of `/var/run/secrets/tokens`. I added `/etc/istio/proxy` and changed ownership for `/var/run/secrets`, matching the official VM setup guidance.
- The Istiod connectivity check appended `:15012` to a variable that could already contain a port. I changed it to use a host-only variable with `nc -vz` for a clearer TCP reachability check.
- The token refresh example repeated the unsupported `--serviceAccount` flag for `istioctl x workload entry configure`. I changed it to reuse `-f workloadgroup.yaml`.

## Review Notes
The guide is technically relevant and broadly aligned with Istio's VM installation model. Future updates should re-check the hardcoded Istio version and the RPM platform support note against the current Istio release documentation.
