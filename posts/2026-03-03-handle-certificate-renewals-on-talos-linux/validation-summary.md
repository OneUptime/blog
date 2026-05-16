# Validation Summary: How to Handle Certificate Renewals on Talos Linux

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Talos Linux (talosctl CLI, COSI resources)
- Kubernetes PKI (kube-apiserver, kubelet, etcd certificates)
- TLS / X.509 certificates
- Prometheus / PrometheusRule (kube-prometheus-stack CRDs)
- Kubernetes CronJob
- Bash scripting, jq, openssl
- Slack webhook for alerting

## Sources Consulted
- Talos v1.9 CLI reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos v1.9 CA rotation: https://docs.siderolabs.com/talos/v1.9/security/ca-rotation
- Talos v1.11 certificate management: https://docs.siderolabs.com/talos/v1.11/security/cert-management
- Talos source: `pkg/machinery/constants/constants.go` (KubernetesAPIServerSecretsDir = `/system/secrets/kubernetes/kube-apiserver`)
- Talos source: `internal/app/machined/pkg/controllers/k8s/control_plane_static_pod.go` (cert file paths)
- siderolabs/talos GitHub Container Registry: https://github.com/siderolabs/talos/pkgs/container/talosctl
- Community reference: monitoring Kubernetes certificates on Talos (KubernetesDynamicCerts resource)

## Issues Found

1. **Invalid COSI resource name `certificate`.** The post repeatedly used `talosctl get certificate`, which is not a valid Talos COSI resource. The correct resource is `KubernetesDynamicCerts`. Replaced every occurrence (in the intro, expiration-check section, bash script, monitoring CronJob, and upgrade-checks section).

2. **Invalid command `talosctl config rotate-certs`.** This subcommand does not exist. Talos uses a top-level `talosctl rotate-ca` command with `--talos` and `--kubernetes` boolean flags (and a `--dry-run` flag for previewing the steps). Rewrote the manual-renewal section to use the correct command with a dry-run example, and updated the surrounding prose so that the talosconfig merge step (`talosctl config merge ./talosconfig`) matches the documented post-rotation workflow.

3. **Wrong certificate filesystem path.** The post used `/system/secrets/kubernetes/certs/apiserver.crt` and `/system/secrets/kubernetes/certs/ca.crt`. The actual path defined in Talos (`KubernetesAPIServerSecretsDir`) is `/system/secrets/kubernetes/kube-apiserver/`. Corrected both `apiserver.crt` and `ca.crt` paths.

4. **Incorrect jq usage on a JSON stream.** `talosctl get <resource> -o json` emits NDJSON (one object per line), not a JSON array, so `jq -r '.[] | ...'` would fail with "Cannot iterate over object". Removed the leading `.[] |` in three places (the one-liner expiration check, the bash report script, and the CronJob alert pipeline) so jq operates on each streamed object directly.

## Review Notes
- The `talosctl reset -n <node-ip> --graceful` example is syntactically valid (the `--graceful` flag exists and defaults to true), but the surrounding prose oversells it as a way to "reset certificates" — `reset` wipes the STATE and EPHEMERAL partitions and reboots the node into maintenance mode, which is far more destructive than just renewing certs. Left as-is since the comment does say "extreme cases" and "reset the machine configuration," but a future revision could clarify the blast radius.
- The container image `ghcr.io/siderolabs/talosctl:v1.9.0` is a real published image; the exact patch version (`v1.9.0`) was a real release in the v1.9 line, so the example is reasonable. Users on newer minor versions should pick the matching tag.
- The `kubectl get --raw /healthz -v=6 2>&1 | grep -i cert` example is a slightly indirect way to inspect the API server certificate (it actually prints connection-level klog debug output, which incidentally includes the TLS cert subject). It works, but `openssl s_client` (used later in the post) is the more direct tool.
- The CA "10 years by default" claim is correct for the Kubernetes CA in Talos (default 10-year CA lifetime); leaf certs default to ~1 year.
- The PrometheusRule example assumes a `x509_cert_not_after` metric, which comes from blackbox-exporter or a similar x509 exporter — not Talos itself. The post does not call this dependency out, but the rule syntax is otherwise correct for the kube-prometheus-stack CRD.
