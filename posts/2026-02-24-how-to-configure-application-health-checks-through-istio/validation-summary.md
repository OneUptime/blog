# Validation Summary: How to Configure Application Health Checks Through Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar injection and probe rewriting
- Kubernetes liveness, readiness, startup, HTTP, TCP, and gRPC probes
- Envoy sidecar proxy behavior
- Spring Boot Actuator health endpoints
- Express health endpoints
- FastAPI health endpoints
- Go HTTP health handler examples

## Sources Consulted
- Istio official documentation: Health Checking of Istio Services - https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio official documentation: Application Requirements / Ports used by Istio - https://istio.io/latest/docs/ops/deployment/application-requirements/
- Kubernetes official documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes official documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Spring Boot official documentation: Kubernetes Probes / Actuator health groups - https://docs.spring.io/spring-boot/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes
- Express official documentation: Routing - https://expressjs.com/en/guide/routing.html
- FastAPI official documentation: Path Operation Configuration and HTTPException - https://fastapi.tiangolo.com/tutorial/handling-errors/

## Issues Found
- The post described rewritten application probes as going to port 15021. Istio's current health-check documentation shows rewritten application probe paths such as `/app-health/<container>/livez` on port 15020. I changed the rewritten probe path examples and the initial explanation to use port 15020.
- The debugging section used `/app-health/...` on port 15021. I changed those commands to use port 15020 and added a separate command for the proxy's own readiness endpoint on port 15021, matching Istio's documented port usage.
- The TCP probe caveat implied that TCP probes with Istio always pass because Envoy listens on application ports. Istio's documentation says default probe rewriting makes the sidecar agent perform the TCP port check while avoiding traffic redirection. I scoped the caveat to cases where probe rewriting is disabled.
- The introductory text said the Envoy proxy sits between the kubelet and the application in a way that could blur the default rewrite path. I changed it to "Istio sidecar" and clarified that default rewriting sends probes to the sidecar agent.

## Review Notes
- Kubernetes gRPC probes are stable as of Kubernetes v1.27 and require a numeric port rather than a named port; the post's examples use numeric ports and are valid.
- Kubernetes only allows `successThreshold` values greater than 1 for readiness probes, and the post uses it only on readiness.
- The framework examples are intentionally partial snippets and use current, valid endpoint patterns.
