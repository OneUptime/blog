# Validation Summary: How to Install ArgoCD on Kind Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kind
- kubectl
- ingress-nginx
- GitHub Actions
- Docker

## Sources Consulted
- Argo CD Getting Started documentation: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD ingress documentation for ingress-nginx: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD cluster management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Kind quick start documentation: https://kind.sigs.k8s.io/docs/user/quick-start/
- Kind configuration documentation for extra port mappings and NodePort: https://kind.sigs.k8s.io/docs/user/configuration/
- Kind ingress documentation: https://kind.sigs.k8s.io/docs/user/ingress/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Kubernetes Service documentation for NodePort behavior: https://kubernetes.io/docs/concepts/services-networking/service/
- helm/kind-action action metadata: https://github.com/helm/kind-action

## Issues Found
- The Linux Kind install command used the `latest` download path and only covered AMD64. Updated it to the current official tagged release commands for AMD64 and ARM64.
- The Kind port mappings did not match the later ingress-nginx example. Updated the config so NodePort and ingress-nginx host-port access use distinct, working host ports.
- The text said there were two exposure options while listing three. Corrected it to three options.
- The NodePort patch used JSON `replace` against a missing `spec.type` field and assigned `nodePort` to the Argo CD HTTP service port while telling readers to use HTTPS. Changed it to add `spec.type` and assign the NodePort to the HTTPS port.
- The ingress-nginx example used SSL passthrough without enabling `--enable-ssl-passthrough` on the controller. Added the deployment patch and rollout wait.
- The Ingress backend referenced port number `443`; updated it to use the named `https` service port, matching Argo CD's documented ingress-nginx example.
- The Ingress access URL did not include the configured Kind host port. Updated it to `https://argocd.localhost:9443`.
- The multi-cluster setup computed a target cluster Docker IP but did not use it, and the default Kind kubeconfig endpoint is not reachable from Argo CD running inside another Kind cluster. Updated the flow to use a temporary kubeconfig whose API server points to `https://target-cluster-control-plane:6443`, then register it with `argocd cluster add --cluster-endpoint kubeconfig`.

## Review Notes
The guide is now technically consistent with current official documentation. A future improvement would be to pin the Argo CD install manifest to a specific release instead of using the moving `stable` branch for fully reproducible tutorials.
