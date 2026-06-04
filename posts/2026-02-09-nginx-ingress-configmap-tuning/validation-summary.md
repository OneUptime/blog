# Validation Summary: How to Configure NGINX Ingress Controller

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes
- ingress-nginx Controller
- NGINX ConfigMap tuning
- Helm
- kubectl
- Prometheus metrics
- TLS, HTTP/2, gzip, and Brotli configuration

## Sources Consulted
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- ingress-nginx custom configuration documentation: https://kubernetes.github.io/ingress-nginx/examples/customization/custom-configuration/
- ingress-nginx Helm chart templates: https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/charts/ingress-nginx/templates/controller-configmap.yaml
- ingress-nginx Helm chart helper templates: https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/charts/ingress-nginx/templates/_helpers.tpl
- ingress-nginx project README and retirement notice: https://github.com/kubernetes/ingress-nginx
- NGINX core, proxy, gzip, Brotli, SSL, HTTP/2, upstream, and limit module references linked from the ingress-nginx ConfigMap documentation.

## Issues Found
- The Helm install command used the release name `nginx-ingress`, while the ConfigMaps and metrics service used names that match the conventional `ingress-nginx` release. Changed the install command to `helm install ingress-nginx ...` so the generated controller ConfigMap and service names match the rest of the article.
- The Helm command used `--set` for Prometheus pod annotations. Changed these to `--set-string` so the annotation values render as Kubernetes annotation strings, matching the official ingress-nginx monitoring documentation.
- The post omitted the current ingress-nginx retirement caveat. Added a short note that the community project is retired as of March 2026 and no longer receives releases, bug fixes, or security updates.
- The buffer example included `fastcgi-buffers-number` and `fastcgi-buffer-size`, which are not current ingress-nginx ConfigMap keys. Replaced them with the supported `grpc-buffer-size-kb` option for a protocol-specific buffer example.
- The request limits example included `client-max-body-size`, which is not a supported ingress-nginx ConfigMap key. Removed it and kept the supported `proxy-body-size` key, which controls NGINX request body size handling in ingress-nginx.
- The TLS example included `ssl-prefer-server-ciphers`, which is not a current ingress-nginx ConfigMap key. Removed it.
- The HTTP/2 example used deprecated `http2-max-field-size` and `http2-max-header-size` settings. Replaced them with `http2-max-concurrent-streams` and `large-client-header-buffers`, matching current ingress-nginx guidance.
- The production ConfigMap included obsolete VTS settings `enable-vts-status` and `vts-status-zone-size`, which are not current ingress-nginx ConfigMap keys. Removed that monitoring block.

## Review Notes
The remaining examples are generic tuning starting points, not universally safe production defaults. Users should validate values against their controller version, workload, node limits, and memory budget before applying them broadly.
