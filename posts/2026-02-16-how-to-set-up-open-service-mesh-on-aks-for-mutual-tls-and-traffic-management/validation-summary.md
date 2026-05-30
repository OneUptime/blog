# Validation Summary: How to Set Up Open Service Mesh on AKS for Mutual TLS and Traffic Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Open Service Mesh (OSM)
- Kubernetes
- Envoy sidecars
- Service Mesh Interface (SMI)
- mTLS
- TrafficTarget, HTTPRouteGroup, and TrafficSplit resources
- Prometheus and Grafana metrics
- OSM certificate providers

## Sources Consulted
- Microsoft Learn: Open Service Mesh add-on in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/open-service-mesh-about
- Microsoft Learn: Install the Open Service Mesh add-on using Azure CLI - https://learn.microsoft.com/en-us/azure/aks/open-service-mesh-deploy-addon-az-cli
- Microsoft Learn: Download and configure the Open Service Mesh client library - https://learn.microsoft.com/en-us/azure/aks/open-service-mesh-binary
- Microsoft Learn: Integrations with Open Service Mesh on AKS - https://learn.microsoft.com/en-us/azure/aks/open-service-mesh-integrations
- Microsoft Learn: Troubleshoot the Open Service Mesh add-on for AKS - https://learn.microsoft.com/en-us/azure/aks/open-service-mesh-troubleshoot
- Open Service Mesh docs: Configure Traffic Policies - https://release-v1-2.docs.openservicemesh.io/docs/getting_started/traffic_policies/
- Open Service Mesh docs: Traffic Splitting - https://release-v1-2.docs.openservicemesh.io/docs/guides/traffic_management/traffic_split/
- Open Service Mesh docs: Certificate Management - https://release-v1-2.docs.openservicemesh.io/docs/guides/certificates/
- Open Service Mesh GitHub releases - https://github.com/openservicemesh/osm/releases
- Official OSM sample manifests - https://raw.githubusercontent.com/openservicemesh/osm-docs/release-v1.2/manifests/apps/bookstore.yaml, https://raw.githubusercontent.com/openservicemesh/osm-docs/release-v1.2/manifests/apps/bookbuyer.yaml, https://raw.githubusercontent.com/openservicemesh/osm-docs/release-v1.2/manifests/access/traffic-access-v1.yaml

## Issues Found
- Added the current OSM lifecycle caveat: CNCF retired the upstream OSM project, and AKS support for the OSM add-on ends on September 30, 2027.
- Corrected overly broad mTLS and access-control claims to apply to meshed workloads and SMI traffic policy mode.
- Replaced the outdated AKS verification pod selectors with the current Microsoft-documented `az aks show` check and `app.kubernetes.io/name=openservicemesh.io` selector.
- Replaced the OSM CLI install command that derived a GitHub release from the AKS controller image tag. AKS can install OSM versions that do not have matching upstream GitHub CLI releases, so the post now uses the Microsoft-documented CLI install pattern and AKS managed-mode OSM config.
- Added the namespace sidecar-injection annotation alongside the monitored-by label, which AKS troubleshooting docs require for injection.
- Updated sample manifests to use named service accounts, `latest-main` OSM sample images, commands, environment variables, and version labels consistent with the official OSM bookstore manifests.
- Updated the TrafficTarget example to reference the named `bookbuyer` and `bookstore` service accounts and official bookstore route names/path matches.
- Corrected the TrafficSplit root service to use the service FQDN form recommended by the OSM traffic-splitting guide and added the missing `bookstore-v2` deployment details needed for the split to work.
- Updated the observability section to enable metrics for the meshed namespaces before checking observability configuration.

## Review Notes
OSM remains technically usable for existing AKS OSM add-on scenarios, but because upstream OSM is archived and AKS support ends on September 30, 2027, future posts should prefer the AKS Istio-based service mesh add-on for new production guidance.
