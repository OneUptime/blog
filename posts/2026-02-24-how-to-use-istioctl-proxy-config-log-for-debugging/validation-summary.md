# Validation Summary: How to Use istioctl proxy-config log for Debugging

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Istio
- istioctl
- Envoy
- Kubernetes
- kubectl

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio 1.20 change notes for `istioctl proxy-config log --level`: https://istio.io/latest/news/releases/1.20.x/announcing-1.20/change-notes/
- Envoy command line options: https://www.envoyproxy.io/docs/envoy/latest/operations/cli
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The performance section gave a specific CPU increase range and said latency increases due to synchronous log writes. Those figures and the synchronous-write claim are too absolute for a general Istio/Envoy guide, so they were changed to workload-dependent wording about increased CPU use, log volume, and I/O pressure.
- Several scenario descriptions said users "will see" specific debug details. Envoy log output varies by Istio/Envoy version, runtime configuration, traffic path, and whether the relevant code paths are exercised, so those statements were changed to "may see" and the sample lines were labeled as simplified examples.
- The reset section only showed `--level warning`. That works for setting all active loggers to warning, but the official Istio command reference also documents `--reset` / `-r` for returning loggers to the default warning level, so an example using `--reset` was added.

## Review Notes
The `istioctl proxy-config log <pod-name[.namespace]>` syntax, `--level` flag, per-logger syntax such as `http:debug,router:debug`, valid Envoy log levels, namespace-qualified pod examples, and `kubectl logs ... -c istio-proxy -n bookinfo -f --tail=100` usage were validated against official Istio, Envoy, and Kubernetes documentation.
