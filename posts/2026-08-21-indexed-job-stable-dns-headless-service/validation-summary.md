# Validation Summary: How to Give Indexed Job Pods Stable DNS with a Headless Service

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes `batch/v1` Jobs and Indexed completion mode
- Kubernetes headless Services and Pod DNS
- Kubernetes EndpointSlices and readiness publication
- Kubernetes Job retry, deadline, duplicate-execution, and cleanup semantics
- `kubectl`, JSONPath, and label selectors
- Bash 5.2, `ping`, and BIND `dig`

## Sources Consulted

- [Kubernetes: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes API reference: Job v1](https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/)
- [Kubernetes: Job with Pod-to-Pod Communication](https://kubernetes.io/docs/tasks/job/job-with-pod-to-pod-communication/)
- [Kubernetes: Indexed Job for Parallel Processing with Static Work Assignment](https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/)
- [Kubernetes: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes: Service and headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes API reference: Service v1](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes API reference: EndpointSlice v1](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes: Well-Known Labels, Annotations and Taints](https://kubernetes.io/docs/reference/labels-annotations-taints/)
- [Kubernetes: Automatic Cleanup for Finished Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/)
- [Kubernetes v1.36.0 EndpointSlice controller utilities](https://github.com/kubernetes/kubernetes/blob/v1.36.0/staging/src/k8s.io/endpointslice/util/controller_utils.go)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: `kubectl exec`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Docker Official Image: Bash](https://hub.docker.com/_/bash)
- [BIND 9 `dig` manual](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)

## Issues Found

- The troubleshooting section referred to an "unconfigured `None` policy," but Kubernetes requires `dnsConfig` whenever `dnsPolicy: None` is used. Changed the text to identify the actual failure mode: a valid `None` policy whose `dnsConfig` does not configure cluster DNS.
- The DNS verification instruction said to run `dig` from "any" running Pod, even though container images are not guaranteed to include that utility. Changed it to require a running Pod that has `dig` installed and uses cluster DNS.
- The Kubernetes DNS documentation link used an obsolete fragment that loaded the page but did not navigate to the Pod hostname and subdomain section. Updated it to the current `#pod-hostname-and-subdomain-field` fragment.

## Review Notes

Indexed completion mode is stable from Kubernetes v1.24. `backoffLimitPerIndex` is stable from v1.33 and requires `completionMode: Indexed` with `restartPolicy: Never`; the manifest satisfies both constraints. The completion-index Pod label is available on v1.28 and later when the `PodIndexLabel` feature gate is enabled, and the post correctly qualifies it as a current-release mechanism.

Both Kubernetes objects passed client-side parsing with `kubectl` v1.34.1, and the Job and Service also passed strict server-side dry-run against Kubernetes v1.35.6 after substituting an existing test namespace for the assumed `batch` namespace. The `bash:5.2` image tag remains published, and the image's `bash -ceu`, `ping`, `hostname`, and `printenv` commands were smoke-tested. The shell name-construction sketch passed syntax checking, and the documented `kubectl`, JSONPath, label-column, label-selector, EndpointSlice, and `dig` options are current.

The manifests assume that the `batch` namespace already exists. Also, `publishNotReadyAddresses: true` can publish any selected non-terminal Pod regardless of readiness, including a terminating Pod until it reaches `Succeeded` or `Failed`; terminal Pods are excluded from generated EndpointSlices. The post correctly treats DNS as discovery rather than proof of health or uniqueness.
