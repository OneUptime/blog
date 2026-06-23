# Validation Summary: How to Configure Nginx for Meteor Applications

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Nginx reverse proxy configuration
- Meteor application deployment
- WebSocket and SockJS/DDP transport
- Node.js process execution
- systemd service configuration
- TLS/SSL termination
- Load balancing and upstream configuration
- Cordova / Meteor mobile hot code push

## Sources Consulted
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx `map` directive documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx logging module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx HTTP load balancing documentation: https://nginx.org/en/docs/http/load_balancing.html
- Meteor environment variables documentation: https://docs.meteor.com/cli/environment-variables
- Meteor deployment documentation: https://docs.meteor.com/tutorials/deployment/deployment
- Meteor `Meteor.settings` API documentation: https://docs.meteor.com/api/meteor#Meteor-settings
- Meteor hot code push troubleshooting documentation: https://docs.meteor.com/troubleshooting/hot-code-push
- Meteor Cordova documentation: https://docs.meteor.com/about/cordova.html

## Issues Found
- The basic Nginx example used `Connection "upgrade"` for every proxied request. Updated it to use the documented `$connection_upgrade` map pattern so normal non-WebSocket requests send `Connection: close` instead of an unconditional upgrade header.
- The systemd example used `METEOR_SETTINGS_FILE`, which is not the documented way to pass settings to a bundled Meteor app. Replaced it with `METEOR_SETTINGS`, matching Meteor's documented requirement that bundled apps receive settings as JSON in the environment variable.
- The sticky-session wording said `ip_hash` is required for Meteor. Softened this to "often needed" for SockJS fallback and multi-instance deployments because the requirement depends on transport and deployment architecture.
- The hot code push section implied `proxy_next_upstream` keeps WebSocket connections open across backend restarts. Reworded it to say Nginx can retry eligible requests while clients reconnect, which matches Nginx retry behavior and Meteor HCP reconnect behavior.
- The debugging snippet said to add `log_format` to the server block. Corrected it to say `log_format` belongs in the Nginx `http` context, while `access_log` can be used in the server block.
- The 502 example described `max_fails` and `fail_timeout` as a health check. Reworded it as passive failure settings because active health checks are not provided by those OSS Nginx directives.
- The summary table overstated sticky sessions and hot code push behavior. Updated those entries to match the corrected explanations.

## Review Notes
The Nginx examples are configuration fragments, so directives such as `map` must be placed where the local Nginx include structure permits `http`-context directives. The post's `http2 on;` usage is current for modern Nginx releases. The TLS cipher examples are intentionally minimal and may need site-specific hardening, but they are not technically invalid.
