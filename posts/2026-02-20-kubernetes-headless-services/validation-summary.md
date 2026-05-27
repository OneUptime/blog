# Validation Summary: How to Use Kubernetes Headless Services for StatefulSet Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes Headless Services
- Kubernetes StatefulSets
- Kubernetes DNS for Services and Pods
- CoreDNS
- EndpointSlices
- kubectl
- Apache Kafka
- PostgreSQL

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/stateful-set-v1/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes dependent environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec
- Kubernetes Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Apache Kafka 3.7 Docker documentation: https://kafka.apache.org/37/getting-started/docker/
- Apache Kafka 3.7 broker configuration documentation: https://kafka.apache.org/37/configuration/broker-configs/

## Issues Found
- The introduction implied that headless Services always return all backing pod IPs. Updated it to clarify that Kubernetes includes ready pods by default, and includes unready pods only when `publishNotReadyAddresses: true` is set.
- The regular Service diagram specifically described `iptables` load balancing. Updated it to use the more general "service proxy" wording because kube-proxy can use different proxying modes and Kubernetes networking implementations vary.
- The DNS resolution diagram referred to listing `Endpoints`. Updated it to refer to EndpointSlices, which are the current Service endpoint API.
- The Kafka example referenced `$(POD_NAME)` before defining `POD_NAME`. Kubernetes environment variable expansion is order-sensitive, so `POD_NAME` was moved before `KAFKA_ADVERTISED_LISTENERS`.
- The troubleshooting command used `kubectl get endpoints`, but the Endpoints API is deprecated in Kubernetes v1.33+. Updated the command and example output to use `kubectl get endpointslice -l kubernetes.io/service-name=postgres-headless`.

## Review Notes
- The post's core explanation of `clusterIP: None`, StatefulSet stable network identities, per-pod DNS names, named-port SRV records, and `publishNotReadyAddresses` is consistent with current Kubernetes documentation.
- Local `kubectl` was not installed in the review environment, so CLI syntax was checked against the official kubectl reference instead of local `kubectl --help` output.
