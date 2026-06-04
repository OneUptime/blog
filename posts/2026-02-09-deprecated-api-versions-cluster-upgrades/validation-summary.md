# Validation Summary: How to Handle Deprecated API Versions During Kubernetes Cluster Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes API deprecation and removal policy
- kubectl and kubectl-convert
- Kubernetes API server metrics and audit logs
- Pluto
- Kube No Trouble (kubent)
- Pod Security Admission and Pod Security Standards
- Ingress networking.k8s.io/v1
- CustomResourceDefinition apiextensions.k8s.io/v1
- Helm
- PrometheusRule

## Sources Consulted
- Kubernetes Deprecation Policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes Pod Security Admission configuration: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes namespace Pod Security labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes kubectl plugin documentation: https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/
- Fairwinds Pluto README and local v5.24.0 CLI help: https://github.com/FairwindsOps/pluto
- Kube No Trouble README: https://github.com/doitintl/kube-no-trouble

## Issues Found
- The Kubernetes deprecation policy description incorrectly said stable APIs are supported for 12 months or 3 releases after deprecation. Updated it to match the official policy: GA API versions may be deprecated but are not removed within a Kubernetes major version.
- The opening statement implied existing resources themselves fail simply because they use deprecated APIs. Clarified that the failure risk is clients, manifests, and controllers calling removed API endpoints.
- The deprecated API metrics command was described as checking the last hour. Corrected the wording because `apiserver_requested_deprecated_apis` is a kube-apiserver gauge metric.
- The audit log example searched ordinary API server pod logs for the word "deprecated". Replaced it with the Kubernetes audit annotation `k8s.io/deprecated=true`, which is the documented signal when audit logging is enabled.
- Several live `kubectl get` examples assumed Kubernetes would return the originally applied deprecated API version. Corrected the examples to use explicit old API endpoints where still served or inspect `kubectl.kubernetes.io/last-applied-configuration`, because the API server can return converted resources at the current API version.
- Updated the Pluto install example from v5.19.0 to the current v5.24.0 release verified during review.
- The kubent sample output said a `policy/v1beta1` PodDisruptionBudget was removed in 1.29, but that API was removed in 1.25. Corrected the example header.
- The storage section referred to PersistentVolume and PersistentVolumeClaim as deprecated storage API candidates. Changed it to scan the deprecated `storage.k8s.io/v1beta1` resources listed by Kubernetes: CSIDriver, CSINode, StorageClass, and VolumeAttachment.
- Pod Security namespace label examples did not include `--overwrite`, which makes repeat migration commands fail if labels already exist. Added `--overwrite`.
- The Helm fallback suggested applying a rendered manifest directly with `kubectl`, which would drift from Helm's managed release state. Replaced it with vendoring or forking the chart templates and upgrading the Helm release from the updated chart.
- The migration documentation example listed PodSecurityPolicy and CronJob as removed in v1.29. Replaced them with FlowSchema and PriorityLevelConfiguration `flowcontrol.apiserver.k8s.io/v1beta2`, which Kubernetes v1.29 stopped serving.

## Review Notes
The pre-upgrade scripts remain examples and depend on resources having a `kubectl.kubernetes.io/last-applied-configuration` annotation. For production migrations, scanning source manifests and Helm releases is still more reliable than relying only on live API output.
