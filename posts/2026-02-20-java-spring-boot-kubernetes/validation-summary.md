# Validation Summary: How to Deploy Spring Boot Applications on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring Boot Actuator
- Micrometer Prometheus registry
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes Ingress
- Kubernetes ConfigMaps and Secrets
- Kubernetes health probes
- Kubernetes Horizontal Pod Autoscaler
- Prometheus scraping

## Sources Consulted
- Spring Boot Actuator endpoints and Kubernetes probes: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Micrometer Prometheus registry installation: https://docs.micrometer.io/micrometer/reference/implementations/prometheus.html
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Ingress API: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
- The Maven dependency snippet added only `spring-boot-starter-actuator` while the post later configures and annotates the `/actuator/prometheus` endpoint. Spring Boot needs a Prometheus registry implementation on the classpath for Prometheus metrics export, so I added the `io.micrometer:micrometer-registry-prometheus` dependency.

## Review Notes
- The Spring Boot Kubernetes liveness and readiness probe paths shown in the post match the Actuator health group endpoints.
- The Kubernetes Deployment, Service, Ingress, Secret, topology spread constraint, and HPA field names are current and valid for the stable API versions shown.
- The HPA memory utilization example depends on resource requests and a working metrics pipeline such as Metrics Server, which the post implicitly assumes.
