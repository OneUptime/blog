# Validation Summary: How to Configure HAProxy for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HAProxy 2.8 configuration
- HTTP and HTTPS load balancing
- TLS termination and ALPN
- HAProxy health checks
- HAProxy stick tables and rate limiting
- HAProxy statistics dashboard and Runtime API socket
- Prometheus metrics exporter
- Linux sysctl and file descriptor tuning
- systemd service limits
- Let's Encrypt certificate renewal hooks

## Sources Consulted
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy 2.8 Management Guide: https://docs.haproxy.org/2.8/management.html
- HAProxy Prometheus metrics documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/prometheus/
- HAProxy traffic policing and stick table documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/traffic-policing/
- HAProxy Debian and Ubuntu package repository: https://haproxy.debian.net/
- HAProxy 2.8.24 Docker image parser and build output via `haproxy -vv` and `haproxy -c`
- OpenSSL command-line behavior for generating a temporary certificate used in config validation

## Issues Found
- The installation section called `ppa:vbernat/haproxy-2.8` the official PPA for the latest stable release. The HAProxy Debian repository describes it as maintained by the Debian HAProxy packaging team, and 2.8 is a maintained LTS branch rather than necessarily the latest stable branch. Updated the wording accordingly.
- The architecture bullet described HAProxy as single-threaded with multi-threading support. Current HAProxy documentation describes HAProxy as a multi-threaded, event-driven, non-blocking daemon. Updated the wording to avoid implying current HAProxy is single-threaded.
- The defaults snippet enabled both `option http-keep-alive` and `option http-server-close`, and described `http-server-close` as backend pooling. `http-server-close` keeps the client side available for keep-alive while closing the server side after responses; it is not backend pooling. Removed the redundant keep-alive line and corrected the comment.
- The `default-server inter 3s fall 3 rise 2` comment said it specified which errors mark a server down. Those settings define check interval and rise/fall thresholds. Updated the comment.
- The HTTP frontend placed `use_backend` before an `http-request redirect` rule. HAProxy accepts the configuration but warns that `http-request` rules are processed before `use_backend` rules. Reordered the rules so the snippet validates without that warning.
- The HTTPS frontend comment said `http-request set-header X-Forwarded-Proto https` enables HTTP/2. HTTP/2 is enabled by the `alpn h2,http/1.1` bind option; the header forwards the original scheme to backends. Updated the comment.
- The stats dashboard section claimed response time percentiles are shown. HAProxy stats and Prometheus metrics expose timing counters/averages rather than percentiles in the examples reviewed. Changed this to response timing averages.
- The key metrics list used `haproxy_backend_queue_current`, which is not the documented HAProxy Prometheus metric. Updated it to `haproxy_backend_current_queue`.

## Review Notes
The combined HAProxy configuration snippets were validated with HAProxy 2.8.24 after substituting a temporary self-signed certificate path for the example certificate. The syntax check passed after the frontend rule ordering fix. Some production recommendations, such as exact timeout values, kernel tunables, and whether health endpoints should check dependencies, remain workload-dependent and should be tested in the target environment.
