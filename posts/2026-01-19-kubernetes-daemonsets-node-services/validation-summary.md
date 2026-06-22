# Validation Summary: How to Run Kubernetes DaemonSets for Node-Level Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes node selectors, node affinity, taints, tolerations, and priority classes
- Fluent Bit log collection
- Prometheus Node Exporter
- Kubernetes CNI plugins
- Kubernetes CSI node plugins and CSI sidecars
- Falco security agent
- PrometheusRule alerting
- kubectl rollout and inspection commands

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes DaemonSet rolling update documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes pod priority and preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes critical add-on pod scheduling documentation: https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/
- Fluent Bit Kubernetes installation documentation: https://docs.fluentbit.io/manual/installation/downloads/kubernetes
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Prometheus Node Exporter documentation: https://github.com/prometheus/node_exporter
- Kubernetes CSI deployment documentation: https://kubernetes-csi.github.io/docs/deploying.html
- CSI node-driver-registrar documentation: https://github.com/kubernetes-csi/node-driver-registrar
- Falco Helm chart documentation: https://github.com/falcosecurity/charts/tree/master/charts/falco

## Issues Found
- The DaemonSet comparison table said DaemonSet scheduling was "Guaranteed per node." Kubernetes creates DaemonSet Pods for eligible nodes and uses node affinity/scheduling to target those nodes, but scheduling can still be constrained by resources, taints, and other pod requirements. Changed the wording to "One per eligible node" and "DaemonSet controller targets eligible nodes."
- The Fluent Bit example used the `docker` parser for `/var/log/containers/*.log`. Current Kubernetes clusters commonly use CRI runtimes such as containerd, and Fluent Bit documents using the `cri` parser for CRI-formatted Kubernetes container logs. Updated the input to `Parser cri` and replaced the parser definition with a CRI regex parser.
- The "Exclude Specific Nodes" DaemonSet manifest omitted the required `spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` so the `apps/v1` DaemonSet is structurally valid.
- The `DaemonSetNotScheduled` Prometheus alert compared desired and current scheduled counts but described `$value` as the number of unscheduled pods. Changed the expression to subtract current scheduled from desired scheduled and alert when the difference is greater than zero.

## Review Notes
- Complete YAML snippets were parsed successfully after the corrections. The two update-strategy examples intentionally contain `# ...` placeholders and were treated as illustrative fragments rather than directly applyable manifests.
- `kubectl` was not installed in the local environment, so command verification was done against official Kubernetes documentation rather than local CLI help output.
