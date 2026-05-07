# Validation Summary: How to Use Podman for Canary Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Nginx
- Kubernetes
- Bash
- Canary deployment workflows
- Container registry image build and push workflows

## Sources Consulted
- Podman `run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman healthcheck overview: https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman create documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman pull documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman push documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Kubernetes Managing Workloads: https://kubernetes.io/docs/concepts/workloads/management/
- Kubernetes Service concept: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress concept: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The single-host Podman example did not define container health checks, but the later monitoring section relied on health evaluation. I updated the `podman run` commands to configure explicit health checks, documented the `/health` and `wget` assumption, and changed the monitoring script to inspect Podman's reported health status instead of manually probing the container.
- The Nginx load balancer was started from the short image reference `nginx:alpine`. Podman documents that unqualified short names can be ambiguous and may prompt for registry resolution, so I changed it to the fully qualified `docker.io/library/nginx:alpine`.
- The promotion script removed the canary container without updating and reloading Nginx first, which could leave traffic still configured for a backend that no longer existed. I added the Nginx config rewrite and reload before the canary container is removed.
- The Kubernetes section implied that the canary `Deployment` itself handled traffic shifting. I corrected the explanation to state that traffic splitting in Kubernetes is handled by a Service selector or an L7 routing layer such as an Ingress, Gateway, or service mesh, and clarified that a Service can target both stable and canary Pods by omitting the `track` label from its selector.

## Review Notes
- The post is technically sound after these fixes.
- The Nginx `weight` settings approximate request distribution using weighted round-robin; they are a reasonable single-host canary example, but they are not a user-sticky or metrics-driven rollout mechanism.
