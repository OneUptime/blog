# Validation Summary: How to Set Up Flux CD on OVHcloud Managed Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OVHcloud Managed Kubernetes Service
- OVHcloud Managed Private Registry / Harbor
- Kubernetes manifests, Secrets, StorageClasses, Services, and Ingress
- Flux CD bootstrap, Kustomization, HelmRelease, ImageRepository, ImagePolicy, and ImageUpdateAutomation
- NGINX Ingress Controller
- OpenStack Cinder CSI storage
- OpenStack Octavia / OVHcloud Load Balancer
- Docker registry authentication
- cert-manager Ingress TLS annotations

## Sources Consulted
- OVHcloud Managed Kubernetes cluster creation documentation: https://help.ovhcloud.com/csm/en-gb-public-cloud-kubernetes-create-cluster?id=kb_article_view&sysparm_article=KB0049683
- OVHcloud kubeconfig retrieval API example: https://help.ovhcloud.com/csm/en-au-public-cloud-kubernetes-vrack-custom-gateway?id=kb_article_view&sysparm_article=KB0050042
- OVHcloud Managed Private Registry creation documentation: https://help.ovhcloud.com/csm/en-gb-public-cloud-private-registry-creation?id=kb_article_view&sysparm_article=KB0050325
- OVHcloud Managed Private Registry image usage documentation: https://help.ovhcloud.com/csm/en-public-cloud-private-registry-create-private-image?id=kb_article_view&sysparm_article=KB0050342
- OVHcloud Managed Kubernetes persistent volumes documentation: https://help.ovhcloud.com/csm/en-ie-public-cloud-kubernetes-persistent-volumes?id=kb_article_view&sysparm_article=KB0049925
- OVHcloud LoadBalancer annotations documentation: https://help.ovhcloud.com/csm/en-sg-public-cloud-kubernetes-using-lb?id=kb_article_view&sysparm_article=KB0050018
- Flux bootstrap GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap GitHub CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux HelmRelease documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux ImageRepository and ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagerepositories/ and https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Harbor Helm chart documentation: https://github.com/goharbor/harbor-helm

## Issues Found
- The cluster example used Kubernetes `1.29`, which is outdated for the current OVHcloud documentation. Changed the sample version to `1.34`.
- The kubeconfig API endpoint was shown as `GET /cloud/project/{serviceName}/kube/{kubeId}/kubeconfig`, but OVHcloud documents this as a `POST` endpoint. Updated the method to `POST`.
- The post said OVHcloud does not have a native container registry, but OVHcloud provides Managed Private Registry, a managed Harbor-based registry. Reworded the statement to accurately describe the managed option.
- The sample registry URL and username implied an incorrect/default setup. Updated the registry URL example to the documented `*.container-registry.ovh.net` pattern and changed the username placeholder to a registry user.
- The registry pull secret was created in `my-app`, while the deployment uses the `web-app` namespace. Updated the namespace commands to create the secret in `web-app`.
- The Flux bootstrap command did not grant write access for later image automation commits. Added `--read-write-key=true`, matching Flux documentation for SSH deploy-key based image automation.
- The Ingress example uses `cert-manager.io/cluster-issuer: letsencrypt-prod`, but cert-manager and that issuer were not listed as prerequisites. Added a prerequisite clarifying that requirement.

## Review Notes
- The Flux API versions used in the examples are current for Flux 2.x documentation.
- The Harbor Helm values shown are consistent with the Harbor Helm chart, but production deployments should replace the auto-generated TLS and inline admin password examples with managed certificates and secret-backed credentials.
- The OVHcloud storage classes and load balancer annotation are valid, but exact availability can vary by OVHcloud plan and region.
