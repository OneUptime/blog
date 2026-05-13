# Validation Summary: How to Deploy IIS Windows Containers with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes Deployments, Services, Ingress, ConfigMaps, probes, node selectors, and tolerations
- Windows containers on Kubernetes
- IIS on Windows Server Core containers
- cert-manager Certificates
- ingress-nginx annotations
- ASP.NET / IIS `web.config`

## Sources Consulted
- Kubernetes Windows containers user guide: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes Windows storage documentation: https://kubernetes.io/docs/concepts/storage/windows-storage/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Flux Kustomization API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Microsoft Windows container IIS image example: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/upgrade-windows-containers

## Issues Found
- The post used a `subPath` ConfigMap mount to mount `web.config` as a single file. Kubernetes Windows storage documentation states that Windows containers only support mounting the whole volume and do not support volume subpath mounts. I changed the snippet to mount the ConfigMap at `C:\iis-config` and copy `web.config` into the IIS site before starting `ServiceMonitor.exe`.
- The Ingress referenced a backend Service named `iis-app`, but the post did not define that Service. I added a Service manifest selecting the `app: iis-app` pods and exposing port 80.
- The Deployment exposed container port 443 even though the TLS example terminates HTTPS at the NGINX Ingress and forwards HTTP to IIS. I removed the unused 443 container port and changed the introduction from IIS HTTPS bindings to Ingress TLS settings.

## Review Notes
- The Windows node selector and `node.kubernetes.io/windows-build: "10.0.20348"` value match Kubernetes guidance for Windows Server 2022 nodes.
- The Flux `Kustomization` fields shown, including `dependsOn`, `timeout`, and `healthChecks`, are valid in the v1 API.
- Because the corrected ConfigMap example copies `web.config` during container startup, teams should ensure pods are rolled after configuration changes when they need IIS to pick up the new file.
