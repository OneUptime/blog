# Validation Summary: How to Build a Jupyter Hub Multi-User Notebook Platform on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Helm
- JupyterHub / Zero to JupyterHub on Kubernetes
- KubeSpawner
- Jupyter Docker Stacks
- GitHub OAuth / OAuthenticator
- LDAPAuthenticator
- NVIDIA GPU scheduling
- Kubernetes PersistentVolumeClaims, ResourceQuota, and Ingress
- Prometheus metrics

## Sources Consulted
- Zero to JupyterHub 3.2.1 configuration reference: https://z2jh.jupyter.org/en/3.2.1/resources/reference.html
- Zero to JupyterHub 3.2.1 chart values and app dependency versions: https://github.com/jupyterhub/zero-to-jupyterhub-k8s/tree/3.2.1
- Zero to JupyterHub user environment docs: https://z2jh.jupyter.org/en/3.2.1/jupyterhub/customizing/user-environment.html
- Zero to JupyterHub user resources docs: https://z2jh.jupyter.org/en/3.2.1/jupyterhub/customizing/user-resources.html
- KubeSpawner configuration reference: https://jupyterhub-kubespawner.readthedocs.io/en/latest/spawner.html
- OAuthenticator GitHub setup and API reference: https://oauthenticator.readthedocs.io/en/latest/tutorials/provider-specific-setup/providers/github.html and https://oauthenticator.readthedocs.io/en/latest/reference/api/gen/oauthenticator.github.html
- LDAPAuthenticator documentation: https://github.com/jupyterhub/ldapauthenticator
- JupyterHub monitoring and metrics docs: https://jupyterhub.readthedocs.io/en/stable/reference/monitoring.html and https://jupyterhub.readthedocs.io/en/latest/reference/metrics.html
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Quay.io Jupyter image tags: https://quay.io/organization/jupyter

## Issues Found
- The initial `proxy.secretToken` value used `"$(openssl rand -hex 32)"` inside YAML, which would be treated as a literal string rather than executed. Changed it to an explicit replacement placeholder while keeping the later `--set proxy.secretToken=$SECRET_TOKEN` command.
- The Jupyter Docker Stacks image tag `2024-01-01` did not exist for the referenced stack images. Updated the examples to valid Quay tags: `quay.io/jupyter/datascience-notebook:2026-06-02`, `quay.io/jupyter/tensorflow-notebook:cuda-2026-06-02`, and `quay.io/jupyter/pytorch-notebook:cuda12-2026-06-02`.
- The PyTorch profile referenced `jupyter/pytorch-notebook`, which is not an official Docker Hub repository. Updated it to the official Quay-hosted Jupyter image.
- Docker Stacks images should be launched with their image CMD when used with the Zero to JupyterHub chart. Added `singleuser.cmd: null` to match the chart documentation.
- The LoadBalancer lookup only read `.status.loadBalancer.ingress[0].ip`, which misses providers that return a hostname. Updated the jsonpath to include both IP and hostname fields.
- The Dockerfile used `jupyter labextension install @jupyter-widgets/jupyterlab-manager`, which is not the recommended path for modern JupyterLab widget support. Replaced it with `pip install --no-cache-dir ipywidgets jupyterlab_widgets`.
- The Ingress example used the legacy `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName: nginx` for `networking.k8s.io/v1`.
- The monitoring snippet started a separate Prometheus HTTP server in the Hub container without exposing it through the chart. Replaced it with `hub.authenticatePrometheus: false`, relying on JupyterHub's built-in metrics endpoint.
- The generic `Authenticator.allowed_groups` example was not correct for the pinned JupyterHub 4.0.2 chart in this context. Removed the group example and kept the valid `allowed_users` example.

## Review Notes
The guide remains pinned to Helm chart version `3.2.1`, which uses JupyterHub `4.0.2`. Future refreshes could update the chart version and revisit authentication examples for JupyterHub 5 and newer OAuthenticator group-management behavior.
