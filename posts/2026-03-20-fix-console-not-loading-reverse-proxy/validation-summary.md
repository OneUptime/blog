# Validation Summary: How to Fix Container Console Not Loading Behind a Reverse Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- WebSocket
- Nginx
- HAProxy
- Apache HTTP Server
- Reverse proxies

## Sources Consulted
- Portainer CE API 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer FAQ, "Why is my console closing after a certain time?": https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Portainer reverse proxy docs: https://docs.portainer.io/advanced/reverse-proxy
- Nginx official WebSocket proxying docs: https://nginx.org/en/docs/http/websocket.html
- HAProxy WebSocket configuration tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/websocket/
- Apache `mod_proxy` docs: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache core docs (`TimeOut`, `ProxyTimeout` interaction): https://httpd.apache.org/docs/current/en/mod/core.html

## Issues Found
- The Apache example used a rewrite-based WebSocket proxy pattern that is no longer the current recommended Apache approach. I replaced it with `ProxyPass ... upgrade=websocket`, which matches current Apache `mod_proxy` documentation for Apache 2.4.47+.
- The Apache example did not set a proxy timeout, even though the post describes timeout tuning as part of the fix. I added `ProxyTimeout 3600` so the Apache snippet also addresses idle console disconnects instead of inheriting Apache's default proxy timeout behavior.
- The HAProxy snippet labeled `option http-server-close` as required for WebSocket upgrade. Current HAProxy documentation presents it as part of the recommended WebSocket configuration, not as a strict requirement, so I corrected the wording and removed the redundant frontend line.
- The final verification note told readers to increase only `proxy_read_timeout`, which is Nginx-specific. I updated it to reference the correct timeout directive for each proxy covered by the post.

## Review Notes
- The post's upstream examples use `http://portainer:9000`, which is still valid when Portainer's HTTP listener is enabled. In current Portainer releases, many deployments default to HTTPS on `9443`, so readers should match the upstream scheme and port to their actual Portainer installation.
