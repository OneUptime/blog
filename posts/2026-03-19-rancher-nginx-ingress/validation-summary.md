# Validation Summary: How to Set Up NGINX Ingress Controller in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- ingress-nginx
- RKE2
- Helm
- Prometheus Operator / ServiceMonitor

## Sources Consulted
- Rancher Helm Charts and Apps: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- ingress-nginx Installation Guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx Bare-metal considerations: https://kubernetes.github.io/ingress-nginx/deploy/baremetal/
- ingress-nginx Annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx Custom errors: https://kubernetes.github.io/ingress-nginx/user-guide/custom-errors/
- ingress-nginx Log format: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/log-format/
- ingress-nginx Helm chart README: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/README.md
- Helm upgrade command reference: https://v3.helm.sh/docs/helm/helm_upgrade/
- RKE2 Networking Services: https://docs.rke2.io/networking/networking_services
- RKE2 ingress-nginx chart patch values: https://raw.githubusercontent.com/rancher/rke2-charts/main-source/packages/rke2-ingress-nginx/generated-changes/patch/values.yaml.patch

## Issues Found
- The Rancher UI install flow assumed `ingress-nginx` was already available under `Apps > Charts`. I added the required `Apps > Repositories` step and the upstream repository URL because Rancher documents custom chart repositories separately and the built-in Rancher chart index does not include `ingress-nginx`.
- The RKE2 note was outdated. I changed it to reflect current RKE2 behavior: existing clusters may have the packaged `rke2-ingress-nginx` add-on, but new RKE2 v1.36+ clusters default to Traefik, and upstream `ingress-nginx` reached end-of-life in March 2026.
- The Helm install examples used `helm install`, which is valid but less robust for repeatable operations. I updated them to `helm upgrade --install`, which matches the current ingress-nginx installation guidance and avoids failing on reruns.
- The bare-metal example implied a general NodePort setup without explaining the access pattern. I clarified that this NodePort approach is appropriate for quick testing and that clients must connect to a node IP or hostname on the configured NodePort.
- Several commands treated RKE2’s packaged controller as if it were the upstream Helm deployment in the `ingress-nginx` namespace. I corrected the verification, configuration, and scaling guidance to distinguish the upstream Helm install from RKE2’s packaged `rke2-ingress-nginx` add-on, which is configured through `HelmChartConfig` and runs as a DaemonSet with host ports enabled by default.
- The ConfigMap example used `log-format-upstream: '$remote_addr - $request_id'`. I changed it to `$req_id`, which is the documented ingress-nginx request ID variable in the log format reference.
- The monitoring upgrade example could overwrite existing release settings if reused carelessly. I added `--reuse-values` and noted that some Prometheus Operator setups require `controller.metrics.serviceMonitor.additionalLabels` to match the selector used by the monitoring stack.
- The troubleshooting `curl` example only covered a LoadBalancer endpoint. I updated it to also show the correct NodePort-style request for the bare-metal example in the post.

## Review Notes
- ingress-nginx is now upstream end-of-life. The post remains technically usable for existing deployments, but for new RKE2 clusters readers should evaluate Traefik or another supported ingress controller.
- ingress-nginx rate limiting is enforced per controller replica, so the effective cluster-wide rate limit increases when the controller is scaled out.
