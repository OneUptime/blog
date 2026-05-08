# Validation Summary: How to Validate Resilience with Chaos Engineering and Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kubernetes Jobs and ConfigMaps
- Chaos Mesh PodChaos and NetworkChaos
- Prometheus and Prometheus Operator PrometheusRule
- ingress-nginx Prometheus metrics
- GitOps resilience validation workflows

## Sources Consulted
- Flux CD Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Chaos Mesh PodChaos documentation: https://chaos-mesh.org/docs/2.7.2/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh NetworkChaos documentation: https://chaos-mesh.org/docs/next/simulate-network-chaos-on-kubernetes/
- Chaos Mesh API reference for PodChaosSpec: https://chaos-mesh.dev/reference/master/
- Prometheus Operator / OpenShift PrometheusRule API reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/monitoring_apis/prometheusrule-monitoring-coreos-com-v1
- Prometheus installation and Docker image documentation: https://prometheus.io/docs/prometheus/latest/installation/
- Docker Hub prom/prometheus Dockerfile: https://hub.docker.com/r/prom/prometheus/dockerfile/
- ingress-nginx monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/

## Issues Found
- The introduction said an SLO failure is recorded in Git history. Flux records the desired configuration in Git, but runtime experiment failures are not automatically written to Git. Updated the sentence to say the configuration that produced the failure is recorded in Git history.
- The PodChaos example used `action: pod-kill` with `duration: "60s"`. Chaos Mesh documents `duration` as required for `pod-failure`; `pod-kill` kills a pod once. Changed the action to `pod-failure` to match the file name and duration-based experiment.
- The NetworkChaos partition example relied on the default direction. Added `direction: to` so the example explicitly matches the documented target-to-destination partition pattern.
- The validation Job used `prom/prometheus:latest` while the script required `sh`, `curl`, `jq`, and `bc`. The Prometheus image is intended to run Prometheus, not as a general scripting image. Changed it to `alpine:3.20`, installed the needed packages, used `jq -r`, handled missing query results, and replaced a Bash-style arithmetic conditional with POSIX-compatible shell syntax.
- The best-practice note recommended storing experiment results as annotations or labels on chaos resources in Git. Labels and annotations are better suited for static metadata, and runtime results require a report artifact or an explicit Git write-back. Updated the recommendation accordingly.

## Review Notes
- The Prometheus service DNS name and ingress metric labels are deployment-specific. The examples are plausible for a typical kube-prometheus and ingress-nginx setup, but readers may need to adjust service names and label filters for their clusters.
- The validation Job installs packages at runtime for readability in a tutorial. For production, a pinned purpose-built image with the required tools preinstalled would be more reproducible.
