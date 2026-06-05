# Validation Summary: How to Set Up OpenTelemetry on DigitalOcean Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Helm charts
- OpenTelemetry Operator auto-instrumentation
- DigitalOcean Kubernetes (DOKS)
- Kubernetes Deployments, DaemonSets, Services, RBAC, and HPA
- Helm
- cert-manager
- OTLP over gRPC and HTTP/protobuf
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector Helm chart source and values: https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-collector
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry agent-to-gateway deployment pattern documentation: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- DigitalOcean doctl Kubernetes cluster create reference: https://docs.digitalocean.com/reference/doctl/reference/kubernetes/cluster/create/
- DigitalOcean doctl kubeconfig save reference: https://docs.digitalocean.com/reference/doctl/reference/kubernetes/cluster/kubeconfig/save/
- DigitalOcean DOKS volumes documentation: https://docs.digitalocean.com/products/kubernetes/how-to/add-volumes/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/
- OneUptime OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The Collector Helm values did not set the Kubernetes Collector image or `otelcol-k8s` command. Updated both agent and gateway examples to use the current Kubernetes Collector distribution required for components such as `kubeletstats`, `filelog`, `k8sattributes`, and `tail_sampling`.
- The agent manually configured `kubeletstats` but did not enable the Helm preset that adds required RBAC and environment setup. Enabled `presets.kubeletMetrics`.
- The agent exporter, verification, port-forward, and auto-instrumentation examples used shortened service names that do not match the default Helm chart resource names for the given releases. Updated them to `otel-gateway-opentelemetry-collector`.
- The gateway used two replicas while also using tail-based sampling. Changed the example to one replica and added a caveat that scaling tail sampling requires trace-aware load balancing so all spans for a trace reach the same gateway instance.
- The verification log command selected both agent and gateway Collectors. Narrowed it to the gateway release label.
- The Python application example sent to port 4317 without setting a gRPC protocol. Updated it to OTLP HTTP/protobuf on port 4318 and added `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`.
- The application example referenced `$(HOSTNAME)` inside `OTEL_RESOURCE_ATTRIBUTES` without defining it as a Kubernetes env var. Added a Downward API `POD_NAME` env var and used `$(POD_NAME)`.
- The Operator Instrumentation example sent all languages to port 4317. Updated the endpoint to port 4318 for HTTP/protobuf and set Node.js protocol explicitly to `http/protobuf`.
- The DOKS create command pinned an old Kubernetes version slug. Changed it to `--version latest` to use a currently supported DOKS version.
- The prerequisites listed Helm 3, while the current upstream Collector chart README lists Helm 4. Updated the prerequisite.
- The cert-manager manifest was pinned to unsupported `v1.14.5`. Updated it to the current documented `v1.20.2` manifest.
- The cert-manager readiness command waited on pods by label, which can fail on completed job pods. Updated it to wait for all cert-manager deployments to become Available.

## Review Notes
- The local environment did not have `helm`, `kubectl`, or `doctl` installed, so CLI validation used official documentation and upstream chart source instead of local `--help` output.
- The YAML snippets in the post were parsed successfully after the edits.
- The scaling table is a general sizing guideline. For deployments that keep tail-based sampling enabled, the post now notes the need for trace-aware load balancing before scaling gateway replicas above one.
