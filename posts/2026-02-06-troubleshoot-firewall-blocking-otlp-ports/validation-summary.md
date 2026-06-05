# Validation Summary: How to Troubleshoot Firewall Rules Blocking OTLP Traffic on Ports 4317 and 4318

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- Kubernetes NetworkPolicy
- kubectl
- netcat
- curl
- AWS EC2 security groups
- Google Cloud firewall rules

## Sources Consulted
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- AWS CLI describe-security-groups reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html
- Google Cloud CLI firewall-rules list reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/list
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The original troubleshooting explanation implied that "connection refused" cleanly distinguishes a down service from a firewall block. Updated it to clarify that silent firewall drops usually cause timeouts, while both a down service and an actively rejecting firewall can produce "connection refused."
- The NetworkPolicy example selected the default namespace using `name: default`. Kubernetes automatically labels namespaces with `kubernetes.io/metadata.name`, not `name`, so the example was updated to `kubernetes.io/metadata.name: default`.
- The Collector workaround configured both OTLP/gRPC and OTLP/HTTP to bind directly to `0.0.0.0:443`. Those are separate receiver servers and cannot both bind the same address and port directly. Updated the example to put one protocol on 443 and leave the other on 4318, with the reverse proxy/ingress option retained for forwarding both protocols internally.
- The egress wording referred only to the Collector's egress even though the preceding example tests from an application pod. Updated it to refer to the sender's egress, whether the sender is the application or the Collector.

## Review Notes
The `curl` examples are acceptable as connectivity checks, but a successful connection to an OTLP/HTTP path may still return an HTTP error because OTLP trace submission expects a POST with a valid payload. That does not invalidate the firewall troubleshooting purpose of the command.
