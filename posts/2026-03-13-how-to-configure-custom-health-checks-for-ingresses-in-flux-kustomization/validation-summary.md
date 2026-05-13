# Validation Summary: How to Configure Custom Health Checks for Ingresses in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux health checks and CEL health check expressions
- Kubernetes Ingress
- Kubernetes Deployments
- cert-manager Certificates
- kubectl and Flux CLI commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CEL health checks cheatsheet: https://fluxcd.io/flux/cheatsheets/cel-healthchecks/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Flux kustomize-controller source for health check expression status readers: https://github.com/fluxcd/kustomize-controller/blob/main/internal/controller/kustomization_controller.go

## Issues Found
- The post described Ingress as if Flux had a built-in health check for it. Flux documentation lists supported built-in Kubernetes health check kinds and does not include Ingress. I updated the explanation and examples to use `spec.healthCheckExprs` with CEL expressions that check `status.loadBalancer.ingress`.
- The post implied that checking an Ingress address verifies TLS and full routing connectivity. Kubernetes Ingress status only indicates the controller has assigned an address. I narrowed the claims and added a cert-manager `Certificate` health check example for certificate readiness.
- The conclusion claimed the setup guarantees full connectivity from the internet to pods. I changed this to say the pipeline waits for the main Kubernetes readiness signals, which is technically accurate.

## Review Notes
All YAML snippets parse successfully after the edits. The Ingress API is stable, but Kubernetes documents it as frozen and recommends Gateway API for new feature development; this is a future improvement note rather than an error in the post.
