# Validation Summary: How to Deploy Ingress-Nginx Controller on Kubernetes on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Kubernetes
- kubectl
- ingress-nginx controller
- NGINX ingress
- firewalld

## Sources Consulted
- Kubernetes ingress-nginx Installation Guide: https://kubernetes.github.io/ingress-nginx/deploy/
- Kubernetes ingress-nginx Bare-metal considerations: https://kubernetes.github.io/ingress-nginx/deploy/baremetal/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl Linux installation documentation: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Red Hat Enterprise Linux 9 firewall documentation: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The original post used placeholder package commands such as `sudo dnf install -y <package-name>` and `rpm -qi <package-name>`, which would not install ingress-nginx or the Kubernetes CLI. Replaced them with the official Linux `kubectl` installation commands and verification commands.
- The original post treated ingress-nginx as a local systemd service with `/etc/<service>/config.conf`, `systemctl`, and `journalctl`. ingress-nginx is deployed into Kubernetes as controller resources, not as a RHEL systemd service. Replaced those commands with `kubectl apply`, `kubectl rollout status`, `kubectl get`, and `kubectl logs`.
- The original firewall example used `--add-service=<service>`, which is not a valid service name for the ingress-nginx NodePort deployment. Replaced it with the NodePort TCP range used by Kubernetes Services and added standard HTTP/HTTPS firewalld examples for host-network or load-balancer deployments.
- The original performance and troubleshooting commands used local process and systemd checks, which do not apply to Kubernetes-managed controller pods. Replaced them with Kubernetes-native inspection commands.
- The original prerequisites omitted an existing Kubernetes cluster and kubeconfig access. Added those prerequisites because an Ingress controller must be installed into a Kubernetes cluster.

## Review Notes
- The guide now uses ingress-nginx controller v1.15.1 because that is the current version referenced by the official ingress-nginx installation documentation consulted during review.
- `kubectl top pods` requires the Kubernetes metrics API, usually provided by Metrics Server. If Metrics Server is not installed, use `kubectl describe` and controller logs for basic troubleshooting.
