# Validation Summary: How to Test Network Policies with kube-hunter from Multiple Namespaces and Network Zones

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes Jobs (`batch/v1`)
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- Kubernetes Services, Pod networking, and EndpointSlices
- Container Network Interface (CNI) network-policy enforcement
- kube-hunter remote and in-Pod scanning
- Kubernetes container security contexts

## Sources Consulted

- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes NetworkPolicy v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/)
- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes Service accounts for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)
- [Kubernetes Security Context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [kube-hunter documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter command-line parser](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter main entry point](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/__main__.py)
- [kube-hunter host discovery implementation](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/hosts.py)
- [kube-hunter logging configuration](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/logging.py)
- [kube-hunter Dockerfile](https://github.com/aquasecurity/kube-hunter/blob/main/Dockerfile)

## Issues Found

No technical issues found.

## Review Notes

The image digest is intentionally a placeholder and must be replaced with the digest of a reviewed image before applying the Job. The selected image should be tested with UID/GID 65532 and a read-only root filesystem, as the post already notes, because the upstream Dockerfile does not declare a non-root user. kube-hunter's documentation lists fewer logging values than its current parser and logging implementation; the source confirms that `NONE` is supported. The guide correctly treats kube-hunter results as reachability evidence rather than full NetworkPolicy conformance testing.
