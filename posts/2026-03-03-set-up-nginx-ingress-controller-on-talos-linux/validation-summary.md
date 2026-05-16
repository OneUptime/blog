# Validation Summary: How to Set Up Nginx Ingress Controller on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- ingress-nginx Controller
- Helm
- NGINX Ingress annotations and ConfigMap configuration
- Prometheus metrics and ServiceMonitor configuration

## Sources Consulted
- ingress-nginx Installation Guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx Bare-metal considerations: https://kubernetes.github.io/ingress-nginx/deploy/baremetal/
- ingress-nginx Annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx Prometheus and Grafana monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- ingress-nginx Helm chart values: https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/charts/ingress-nginx/values.yaml
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Talos Linux getting started documentation: https://docs.siderolabs.com/talos/v1.8/getting-started/getting-started
- Talos Linux kernel module documentation: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/custom-images-and-development/kernel-module

## Issues Found
- The monitoring section incorrectly stated that ingress-nginx exposes Prometheus metrics by default. The current official Helm chart has `controller.metrics.enabled: false` and `controller.metrics.serviceMonitor.enabled: false` by default. I changed the text to say metrics can be exposed when enabled through Helm values.
- The monitoring section described the `controller.metrics` snippet as service annotations. It is Helm values YAML, not Kubernetes annotations. I changed the wording to identify it as Helm values that enable metrics and create a ServiceMonitor.

## Review Notes
- The Helm install commands, Kubernetes Ingress manifest shape, ingress-nginx annotation names, ConfigMap keys, NodePort range example, and Talos API/no-SSH claims match the consulted official documentation.
- The ServiceMonitor example assumes the Prometheus Operator CRDs are installed. In many kube-prometheus-stack setups, additional ServiceMonitor labels may be required to match the Prometheus release selector.
