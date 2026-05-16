# Validation Summary: How to Troubleshoot Kubernetes Control Plane Issues on Talos

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes control plane
- kube-apiserver
- kube-controller-manager
- kube-scheduler
- etcd
- kubectl
- talosctl

## Sources Consulted
- Talos Linux CLI reference: https://www.talos.dev/latest/reference/cli/
- Talos Linux troubleshooting guide: https://www.talos.dev/v1.11/introduction/troubleshooting/
- Talos Linux static pods documentation: https://www.talos.dev/v1.11/advanced/static-pods/
- Talos Linux configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos Linux disaster recovery documentation: https://www.talos.dev/latest/advanced/disaster-recovery/
- Kubernetes API health endpoint documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes ComponentStatus API reference: https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/component-status-v1/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes controllers documentation: https://kubernetes.io/docs/concepts/architecture/controller/

## Issues Found
- The post stated that all listed components, including etcd, run as static pods on Talos. Talos runs kube-apiserver, kube-controller-manager, and kube-scheduler as static pods, while etcd runs as a Talos service. Updated the introduction and static pod explanation.
- The post used `kubectl get --raw='/healthz'` and `kubectl get componentstatuses` for health checks. Kubernetes marks `/healthz` as deprecated in favor of `/livez` and `/readyz`, and ComponentStatus is deprecated. Replaced these checks with `/readyz` and `/readyz?verbose`.
- The post used `talosctl service kube-apiserver`, `talosctl service kube-controller-manager`, and `talosctl service kube-scheduler`. These Kubernetes control plane components are static pods, not Talos services. Replaced those checks with `talosctl get staticpodstatus`.
- The post used `talosctl logs kube-apiserver`, `talosctl logs kube-controller-manager`, and `talosctl logs kube-scheduler`. Talos static pod logs should be read from the Kubernetes container namespace using `talosctl logs -k` with the container ID. Added `talosctl containers -k` discovery steps and updated log commands.
- The post suggested restarting `kube-apiserver` directly as a Talos service. Since it is a static pod, changed the restart guidance to restart kubelet, which manages the static pods.
- The scheduler section said to check the static pod manifest but only showed static pod status. Added `talosctl get staticpods` alongside `talosctl get staticpodstatus`.
- The summary recommended `talosctl services` and `talosctl logs` generically. Updated it to the current diagnostic commands for Talos services and Kubernetes static pod containers.

## Review Notes
- `kubectl top` commands require metrics-server or another Metrics API provider to be installed; the commands are syntactically correct, but they may not work on clusters without metrics collection.
- The post does not pin a Talos or Kubernetes version. The corrected commands were checked against current Talos and Kubernetes documentation available on 2026-05-16.
