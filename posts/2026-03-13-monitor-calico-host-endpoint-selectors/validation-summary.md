# Validation Summary: Monitor Calico Host Endpoint Selectors

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico HostEndpoint resources
- Calico Felix Prometheus metrics
- calicoctl
- Kubernetes audit policy
- Kubernetes CronJob
- Kubernetes ValidatingWebhookConfiguration
- Prometheus alerting rules

## Sources Consulted
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico recommended metrics documentation: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Kubernetes node protection and automatic HostEndpoint documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl Kubernetes API datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico KubeControllersConfiguration documentation: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes admissionregistration.k8s.io/v1 API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/
- Kubernetes admissionregistration v1 Go API documentation: https://pkg.go.dev/k8s.io/api/admissionregistration/v1

## Issues Found
- The Prometheus alert annotations referenced `{{ $labels.node }}`, but the documented Felix metric examples use scrape labels such as `instance`, `pod`, and `namespace`, not a guaranteed `node` label. Changed the annotations to use `{{ $labels.instance }}`.
- The CronJob used `calicoctl get hep --selector=...`, but the current `calicoctl get` documentation does not list a `--selector` option. Replaced it with the documented `go-template` output mode and `wc -l` counting.
- The CronJob used `python3` inside the `calico/ctl` container without establishing that the image includes Python. Replaced the Python JSON parsing with shell, `calicoctl`, Go template output, and `wc`.
- The CronJob did not configure in-cluster `calicoctl` access. Added Kubernetes datastore environment variables and service account token export based on the documented Kubernetes API datastore configuration options.
- The CronJob pinned `calico/ctl:v3.27.0` while current Calico documentation reviewed is for Calico Open Source 3.32. Updated the example to `calico/ctl:v3.32.0`.
- The ValidatingWebhookConfiguration used `failurePolicy: Warn`, but `admissionregistration.k8s.io/v1` allows `Ignore` or `Fail`. Changed it to `Fail`, which matches the stated goal of preventing unauthorized label changes.
- The ValidatingWebhookConfiguration omitted required/current `v1` webhook fields. Added `admissionReviewVersions: ["v1"]` and `sideEffects: None`.

## Review Notes
The post remains a monitoring guide rather than a complete production deployment. The CronJob still assumes the `calico-auditor` ServiceAccount has RBAC to read HostEndpoint resources, and the webhook example assumes a working TLS-backed `label-validator` service with an appropriate `caBundle` or equivalent certificate injection.
