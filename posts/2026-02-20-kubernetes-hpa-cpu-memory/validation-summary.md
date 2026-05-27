# Validation Summary: How to Set Up Kubernetes Horizontal Pod Autoscaler Based on CPU and Memory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes Metrics Server
- kubectl
- Kubernetes resource requests and limits

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Resource Management for Pods and Containers documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Metrics Server repository installation documentation: https://github.com/kubernetes-sigs/metrics-server

## Issues Found
- The load generator used `http://web-app`, but the example manifest only created a Deployment. Kubernetes does not create a DNS name for a Deployment by itself; a Service is needed for same-namespace DNS resolution by service name. I added a ClusterIP Service named `web-app` to the `deployment.yaml` example.
- The test section said to generate load "to see HPA in action" against a static nginx workload. Repeated HTTP requests to nginx may not reliably raise CPU or memory above the HPA targets, so scaling is not guaranteed. I changed the wording to say the test generates request traffic and lets the reader watch HPA metrics, while noting that nginx may not consume enough CPU or memory to trigger scaling in every cluster.

## Review Notes
The HPA autoscaling/v2 examples, resource metric target fields, multiple-metric behavior, Metrics Server install command, kubectl commands, and resource request/limit examples align with the official Kubernetes documentation. The `behavior.scaleUp.stabilizationWindowSeconds` comment is simplified, but the field itself is valid and the surrounding description correctly frames behavior policies as smoothing and rate-limiting controls.
