# Validation Summary: How to Set Resource Limits for Sidecar Containers in Multi-Container Pods

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes resource requests and limits
- Kubernetes init containers and sidecar containers
- Kubernetes QoS classes
- kubectl
- Istio sidecar resource annotations
- Prometheus exporters
- Fluent Bit
- Envoy

## Sources Consulted
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Sidecar Containers - https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes documentation: Pod Quality of Service Classes - https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes documentation: kubectl top pod - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Istio documentation: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Prometheus statsd_exporter documentation - https://github.com/prometheus/statsd_exporter
- Docker Hub: prom/statsd-exporter - https://hub.docker.com/r/prom/statsd-exporter

## Issues Found
- The post said Pods are scheduled based on the sum of all container requests. This was too broad because init container requests are accounted for separately. Updated the wording to distinguish regular containers from init containers.
- The init container resource note used `max(init, sum of app containers)`, which was imprecise and omitted Kubernetes-native sidecar accounting. Updated it to describe regular init containers and native sidecars defined with `restartPolicy: Always`.
- The QoS section described Burstable and Guaranteed as sidecar-level properties. Kubernetes assigns QoS to the whole Pod, so the section was updated to describe Pods with sidecars and to state that Guaranteed requires every container to set equal CPU and memory requests and limits.
- The monitoring exporter explanation said exporters "scrape occasionally." Prometheus generally scrapes exporters, so the sentence was corrected to say exporters are scraped periodically.
- The CPU throttling command did not select the sidecar container and only used the cgroup v1 path. Updated the command to use `kubectl exec -c envoy` and try the cgroup v2 `cpu.stat` path before falling back to the cgroup v1 path.
- The monitoring exporter examples used `prom/node-exporter:latest` and `prom/jmx-exporter:latest`. Node Exporter is normally a node-level exporter rather than a typical application sidecar, and `prom/jmx-exporter:latest` is not a valid public image reference. Replaced both examples with `prom/statsd-exporter:latest`, which the Prometheus project documents as working well as a Kubernetes sidecar, and used its default metrics port `9102`.

## Review Notes
The resource sizing values are reasonable examples, but actual sidecar sizing remains workload-specific. The post correctly emphasizes measuring real usage, testing under load, and accounting for sidecar requests in Pod capacity planning.
