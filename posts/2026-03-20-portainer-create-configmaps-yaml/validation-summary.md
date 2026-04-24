# Validation Summary: How to Create ConfigMaps via YAML Manifest in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- ConfigMaps
- YAML manifests
- `kubectl`
- Spring Boot
- NGINX
- GitOps

## Sources Consulted
- Portainer docs: ConfigMaps & Secrets - https://docs.portainer.io/sts/user/kubernetes/configurations
- Portainer docs: Add a ConfigMap - https://docs.portainer.io/user/kubernetes/configurations/add
- Portainer docs: Add a new application using code - https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Portainer docs: Create an application from a Manifest - https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer release notes - https://docs.portainer.io/sts/release-notes
- Kubernetes docs: ConfigMaps - https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes docs: Configure a Pod to Use a ConfigMap - https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes docs: `kubectl create configmap` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Spring Boot docs: Graceful Shutdown - https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Spring Boot docs: Actuator Endpoints - https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Spring Boot API docs: `RedisProperties` - https://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/autoconfigure/data/redis/RedisProperties.html
- NGINX docs: `ngx_http_proxy_module` - https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX docs: `ngx_http_log_module` - https://nginx.org/en/docs/http/ngx_http_log_module.html

## Issues Found
- The Portainer navigation and button labels were outdated. I changed the post from older UI wording such as `+ Add with manifest`, `Advanced deployment`, and `Use manifest` to the current documented flow: `Create from manifest` or `Applications` → `Create from code` → `Manifest` → `Web editor`.
- The post used manifests with `metadata.namespace` but did not mention Portainer's current `Use namespace(s) specified from manifest` option or that the target namespace must already exist unless it is created separately. I added that guidance so the examples work as written.
- The Spring Boot example used the older `spring.redis.*` property prefix. Current Spring Boot documentation exposes Redis configuration under `spring.data.redis.*`, so I updated the YAML snippet.
- The immutable ConfigMap explanation said the Kubernetes API server does not watch for changes. I revised that line to match Kubernetes documentation more closely: immutable ConfigMaps reduce kube-apiserver load by closing watches for those resources.
- The deployment step used `Deploy` or `Apply` interchangeably and presented the output as fixed. I updated it to the current `Deploy` wording and clarified that the shown output is a similar first-time deployment summary.

## Review Notes
- The Kubernetes ConfigMap manifests, multi-document YAML example, and `kubectl create configmap` commands are technically correct after the fixes.
- The NGINX and Spring Boot snippets are illustrative configuration examples rather than full runnable applications, but the directives and property names used were checked against official documentation.
- Older Spring Boot 2.x material commonly uses `spring.redis.*`; the post was updated to the current `spring.data.redis.*` prefix documented by current Spring Boot references.
- `kubectl` is not installed in this workspace, so CLI examples were validated against official Kubernetes reference documentation rather than local `--help` output.
- Portainer UI labels can vary across older releases; this review aligned the post with the current official Portainer documentation available on April 24, 2026.
