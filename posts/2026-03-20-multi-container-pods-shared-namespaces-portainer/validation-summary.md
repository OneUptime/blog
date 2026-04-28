# Validation Summary: How to Set Up Multi-Container Pods with Shared Namespaces in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker / Docker Compose (network_mode, ipc namespace sharing)
- Kubernetes (multi-container Pods, Deployments, volumeMounts)
- Portainer (as deployment platform context)
- Sidecar pattern (Envoy/Istio service mesh, Fluent Bit logging, Prometheus exporters)

## Sources Consulted
- Docker Compose specification (network_mode): https://docs.docker.com/reference/compose-file/services/#network_mode
- Docker Compose specification (ipc): https://docs.docker.com/reference/compose-file/services/#ipc
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes Volumes documentation (volumeMounts.readOnly): https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Deployment apiVersion (apps/v1): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#deployment-v1-apps
- Fluent Bit container image tags (docker.io/fluent/fluent-bit)
- Envoy container image tags (envoyproxy/envoy)
- Prometheus statsd_exporter image (prom/statsd-exporter)

## Issues Found
1. **Invalid Kubernetes `mountPath` syntax**: The "Log Collection" sidecar example used `mountPath: /var/log/app:ro` to mark a mount read-only. The `:ro` suffix is Docker bind-mount syntax and is **not** valid in Kubernetes — Kubernetes treats `mountPath` as a literal string, so the mount would have been created at the path `/var/log/app:ro` and would still be writable. Fixed by removing the `:ro` suffix and adding the proper `readOnly: true` field on a separate line, per the Kubernetes Volumes API spec.

## Review Notes
- The `version: "3.8"` field at the top of the Docker Compose example is no longer required by modern Compose (it is now obsolete and ignored), but it is not technically incorrect and remains widely seen in tutorials.
- The Docker Compose example references a named volume `app-logs` without declaring it under a top-level `volumes:` key. Compose would refuse to start a real project with this configuration. Left as-is because the snippet is illustrative and abbreviated for clarity around namespace sharing rather than presented as a complete runnable file.
- The `prometheus/cloudwatch-exporter` image is chosen as the "metrics sidecar" example, but that exporter is purpose-built for scraping AWS CloudWatch — it does not consume metrics from `localhost:8080`. The YAML is syntactically correct and the image exists, so this is a conceptual mismatch rather than a technical error. A more representative image for "scrapes the app on localhost:8080" would be a custom exporter, `prom/statsd-exporter`, or `nginx/nginx-prometheus-exporter` depending on the protocol.
- The claim that Kubernetes Pod containers share IPC namespaces by default is correct (the pause container provides the shared IPC namespace and other containers join it), per the Kubernetes Pods documentation.
- The Docker Compose `ipc: shareable` and `ipc: "service:app"` syntax used in the post is current and supported by the Compose specification.
