# Validation Summary: How to Deploy a Spring Boot Application to GKE with Horizontal Pod Autoscaling

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Spring Boot
- Spring Boot Actuator
- PostgreSQL JDBC
- Docker
- Google Kubernetes Engine
- Kubernetes Deployments, Services, Ingress, Secrets, and probes
- Kubernetes Horizontal Pod Autoscaler
- Google Cloud SQL Auth Proxy
- GKE Workload Identity Federation
- Google Artifact Registry

## Sources Consulted
- Spring Boot Actuator metrics documentation: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Spring Boot common application properties: https://docs.spring.io/spring-boot/appendix/application-properties/
- Cloud SQL Auth Proxy for PostgreSQL documentation: https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Cloud SQL Auth Proxy GitHub documentation: https://github.com/GoogleCloudPlatform/cloud-sql-proxy
- GKE Workload Identity Federation concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- GKE Workload Identity Federation setup guide: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GKE Ingress documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/ingress
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/

## Issues Found
- The Spring Boot Prometheus metrics export property used the old `management.metrics.export.prometheus.enabled` namespace. Updated it to `management.prometheus.metrics.export.enabled`, which is the current Spring Boot property.
- The Cloud SQL Auth Proxy sidecar image referenced `2.8.0`, while current Google Cloud documentation uses `2.22.0`. Updated the image tag to `2.22.0`.
- The closing explanation said Cloud SQL Proxy provides connectivity without VPC peering or public IPs. That was too broad because the proxy still requires a network path, and private-IP-only instances require `--private-ip` plus VPC connectivity from the workload. Reworded the claim to focus on avoiding authorized networks and manual SSL certificate management, and added the private IP caveat.

## Review Notes
- The GKE Ingress example uses the `kubernetes.io/ingress.class: "gce"` annotation. Kubernetes marks the annotation pattern as deprecated generally, but GKE documentation says GKE Ingress still relies on this annotation and ignores `ingressClassName` for GKE Ingress, so no change was made.
- The HPA example uses `autoscaling/v2` with CPU and memory resource metrics, which matches the current stable Kubernetes API. It requires the Kubernetes metrics API to be available for resource metrics.
