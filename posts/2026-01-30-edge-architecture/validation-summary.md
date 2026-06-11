# Validation Summary: How to Build Edge Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Edge computing architecture
- Kubernetes
- K3s
- Rancher Fleet
- Node.js
- better-queue
- Axios
- Python
- SQLite
- OpenTelemetry Collector
- Kubernetes NetworkPolicy
- Bitnami Sealed Secrets
- MQTT, HTTP, Modbus

## Sources Consulted
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Agent CLI documentation: https://docs.k3s.io/cli/agent
- K3s resource profiling: https://docs.k3s.io/reference/resource-profiling
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- better-queue documentation: https://github.com/diamondio/better-queue
- better-queue-sql package documentation: https://www.npmjs.com/package/better-queue-sql
- Axios request configuration documentation: https://axios-http.com/docs/req_config
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- SQLite documentation: https://www.sqlite.org/docs.html
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector exporter helper documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector file exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- Rancher Fleet fleet.yaml reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Rancher Fleet GitRepo targeting documentation: https://fleet.rancher.io/how-tos-for-users/gitrepo-targets
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- KubeEdge documentation: https://kubeedge.io/docs/
- MicroK8s getting started documentation: https://canonical.com/microk8s/docs/getting-started
- k0s system requirements documentation: https://docs.k0sproject.io/head/system-requirements/

## Issues Found
- The K3s install script passed multiple labels as one comma-separated `--node-label` value, which is not the documented pattern and would not produce the labels used later by `nodeSelector`. I changed it to pass separate `--node-label` flags and added the `node-role=edge` label used by the workload.
- The workload tolerated a `node-role=edge:NoSchedule` taint, but the K3s install command did not apply that taint. I added the matching `--node-taint` flag and corrected the comment.
- The K3s `--kubelet-arg` example used `--max-pods=50`. I changed it to the documented `max-pods=50` form.
- The sync service claimed exponential backoff, but better-queue's documented `retryDelay` option is a fixed delay. I changed the wording to "fixed retry delay."
- The better-queue persistence example used a non-documented `store: { type: 'file' }` configuration. I changed it to use a SQLite-backed `better-queue-sql` store.
- The configuration sync service called `this.emit(...)` without extending `EventEmitter`. I updated the class to extend `EventEmitter` and call `super()`.
- Axios rejects non-2xx responses by default, so the `response.status === 304` branch would not run. I added `validateStatus` to accept 304 responses.
- The Python examples used `datetime.utcnow()`, which is deprecated in current Python documentation. I changed these to timezone-aware `datetime.now(timezone.utc)` calls.
- The SQLite `mark_synced` method could issue an unnecessary empty `IN ()` update when called with no event IDs. I added an early return.
- The OpenTelemetry Collector snippet described local buffering but only configured retry, not a persistent sending queue. I added `sending_queue.storage: file_storage` and changed `max_elapsed_time` to `0s` so queued telemetry is not abandoned after one hour.
- The file exporter was described as a fallback, but exporters in the same pipeline both receive telemetry. I changed the comment to describe it as a local audit copy.
- The NetworkPolicy comment said egress was allowed only to the cloud endpoint, but `ipBlock: 0.0.0.0/0` permits HTTPS egress broadly. I corrected the comment.
- The Rancher Fleet example used an invalid `kind: Fleet` resource and mixed GitRepo fields into `fleet.yaml`. I changed the snippet to a valid `fleet.yaml` bundle customization shape with `targetCustomizations`.

## Review Notes
The post is a broad architecture guide with illustrative snippets rather than a complete deployable project. The corrected examples are syntactically valid, but production use would still require environment-specific choices such as TLS/mTLS, exact NetworkPolicy CIDRs or CNI support for FQDN policies, storage sizing, dependency installation, and GitRepo configuration for Fleet repository and branch selection.
