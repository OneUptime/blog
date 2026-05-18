# Validation Summary: How to Set Up MicroK8s for Edge Deployments on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MicroK8s (1.29/stable)
- Kubernetes (kubectl, LimitRange, ResourceQuota, Deployment, livenessProbe)
- Snap / snapd
- Ubuntu 20.04 / 22.04 / Ubuntu Core
- UFW (firewall)
- Calico CNI
- containerd / `ctr`
- dqlite (HA backing store)
- kube-prometheus-stack (observability add-on), Grafana
- Built-in MicroK8s registry
- Edge computing patterns (Modbus, MQTT)

## Sources Consulted
- MicroK8s ports reference: https://canonical.com/microk8s/docs/ports
- MicroK8s configuring services: https://canonical.com/microk8s/docs/configuring-services
- MicroK8s dashboard add-on: https://canonical.com/microk8s/docs/addon-dashboard
- MicroK8s sideload (image import) docs: https://canonical.com/microk8s/docs/sideload
- MicroK8s clustering / `add-node` / `join`: https://canonical.com/microk8s/docs/clustering
- MicroK8s add launch config: https://canonical.com/microk8s/docs/add-launch-config
- microk8s-core-addons repo (prometheus -> observability deprecation notice)
- Kubernetes API reference for LimitRange / ResourceQuota / Deployment
- snapd `refresh.schedule` documentation

## Issues Found
1. **Missing markdown heading prefix on "Resource Limits for Edge Hardware".** The line was a bare paragraph instead of an `##` section header, breaking the table of contents. Added the `##` prefix.

2. **`microk8s ctr images import` / `microk8s ctr images list` are wrong.** The containerd CLI bundled with MicroK8s uses the singular subcommand `image`, not `images`. Changed both invocations to `microk8s ctr image import` and `microk8s ctr image list` (per https://canonical.com/microk8s/docs/sideload).

3. **`sudo snap set microk8s start-timeout=60s` is not a real MicroK8s snap config key.** It does not exist in MicroK8s' configure hook, silently no-ops, and would mislead readers. The MicroK8s snap auto-starts on boot already; no config is needed. Removed the bogus line and replaced it with a clarifying comment.

4. **The `prometheus` add-on was deprecated in v1.25 and removed in favor of `observability`.** Running `microk8s enable prometheus` on 1.29 prints a deprecation warning and redirects (and will fail outright in future releases). The Grafana access details were also wrong for the observability stack — there is no default NodePort 31000; the documented method is `kubectl port-forward` against `service/kube-prom-stack-grafana` in the `observability` namespace. Updated the section to use `observability`, fixed the access method, and kept the (still-correct) default `admin/prom-operator` credentials.

## Review Notes
- The MicroK8s 1.29 channel is still available, but readers using current LTS workloads may want to pick a newer channel (e.g., 1.30/stable or 1.31/stable). The post's choice of 1.29 is internally consistent, so no change made.
- The `helm` and `helm3` add-ons are both listed in the example status output. In current MicroK8s these are aliases (`helm3` is retained as a back-compat alias for `helm`); the dual listing reflects what users actually see, so left as-is.
- The note about `--snapshot-count` for `k8s-dqlite` is presented only as an "etcd equivalent" comment, not an actual flag to add — left as-is.
- The kube-apiserver tuning flags `--max-requests-inflight` and `--max-mutating-requests-inflight` are valid upstream Kubernetes flags and will be picked up when added to `/var/snap/microk8s/current/args/kube-apiserver`.
- The `nodeName: edge-node-1` pinning in the example Deployment bypasses the scheduler; for production edge workloads `nodeSelector` or affinity rules are usually preferable, but the example is technically valid.
