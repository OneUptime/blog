# Validation Summary: How to Fix Incorrect Span Timestamps Caused by Clock Skew Between Containers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing and Collector transform processor
- OpenTelemetry Transformation Language (OTTL)
- Kubernetes `kubectl debug`, pods, and DaemonSets
- Jaeger query clock skew adjustment
- NTP, chrony, and cloud VM time synchronization
- Prometheus Node Exporter and `node_timex_offset_seconds`
- Go and Python monotonic clock APIs

## Sources Consulted
- Kubernetes `kubectl debug` node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes generated `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes DaemonSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- OpenTelemetry Collector processor registry: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL function documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- Jaeger deployment clock skew adjustment documentation: https://www.jaegertracing.io/docs/1.26/deployment/#clock-skew-adjustment
- Jaeger CLI flag documentation for `--query.max-clock-skew-adjustment`: https://www.jaegertracing.io/docs/1.22/deployment/cli/
- AWS EC2 Amazon Time Sync Service documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-ec2-ntp.html
- Google Compute Engine time synchronization documentation: https://docs.cloud.google.com/compute/docs/instances/time-synchronization
- Google GKE node images documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/node-images
- Azure Linux VM time sync documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/time-sync
- Prometheus Node Exporter documentation: https://github.com/prometheus/node_exporter
- Go `time` package documentation: https://pkg.go.dev/time
- Python `time` module documentation: https://docs.python.org/3/library/time.html

## Issues Found
- The post described skew as being between containers. I changed the wording to nodes or machines because Kubernetes containers normally use the host kernel clock; node or VM clock skew is the usual source.
- The `kubectl debug` examples checked time and chrony inside the debug container rather than the host. I changed them to use the host filesystem via `/host` and `--profile=sysadmin` for host inspection.
- The pod time checks used `date +%s%N`, which is not portable in BusyBox-style environments. I changed the examples to millisecond precision with `%3N` in contexts using GNU `date`.
- The cloud-provider notes were overgeneralized. I corrected AWS to say EC2 instances can use Amazon Time Sync Service, refined GCP wording based on GKE node images and Compute Engine time sync docs, and corrected Azure to describe Linux VM time sync services and `/dev/ptp_hyperv`.
- The Jaeger section said the UI automatically adjusts skew. Recent Jaeger CLI docs show `--query.max-clock-skew-adjustment` defaults to `0s`, disabling adjustment, so I changed the text to say the query layer can apply adjustment when configured.
- The DaemonSet YAML was invalid for `apps/v1` because it lacked `spec.selector` and matching pod template labels. It also used `ntpdate` from BusyBox, which is not reliable. I replaced it with a valid Node Exporter DaemonSet-style monitor using the `timex` collector.
- The Collector transform snippet used invalid OTTL paths and an invalid `Duration(start_time, Now())` call. I replaced it with valid `span.start_time`, `span.end_time`, `Now()`, and `UnixNano()` usage, and clarified that this can only repair obviously invalid timestamps, not infer true clock-skewed operation times.

## Review Notes
The Go and Python monotonic clock examples are technically consistent with official language documentation. The Prometheus alert assumes Node Exporter exposes the `timex` collector metric on the target nodes; teams should confirm their Node Exporter deployment and permissions expose `node_timex_offset_seconds`.
