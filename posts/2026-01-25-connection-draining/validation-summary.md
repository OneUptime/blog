# Validation Summary: How to Configure Connection Draining

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy
- NGINX and NGINX Plus
- AWS Application Load Balancer / Elastic Load Balancing v2
- Kubernetes pod termination lifecycle
- Python `http.server`
- Go `net/http`
- Bash scripting

## Sources Consulted
- HAProxy Runtime API `set server`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/set-server/
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- NGINX `ngx_http_upstream_module`: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX runtime control / reload signals: https://docs.nginx.com/nginx/admin-guide/basic-functionality/runtime-control/
- AWS ELBv2 TargetGroupAttribute API reference: https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_TargetGroupAttribute.html
- AWS CLI `describe-target-health` target state reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-target-health.html
- Boto3 ELBv2 `modify_target_group_attributes`: https://docs.aws.amazon.com/boto3/latest/reference/services/elbv2/client/modify_target_group_attributes.html
- Boto3 ELBv2 `deregister_targets`: https://docs.aws.amazon.com/goto/boto3/elasticloadbalancingv2-2015-12-01/DeregisterTargets
- Kubernetes Container Lifecycle Hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes Pod Lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Python `http.server` documentation: https://docs.python.org/3/library/http.server.html
- Go `net/http` package documentation: https://pkg.go.dev/net/http

## Issues Found
- HAProxy admin socket command was shown, but the sample configuration did not enable the runtime socket. Added `stats socket /var/run/haproxy.sock mode 660 level admin` so the `socat` commands have a configured socket to connect to.
- HAProxy `timeout server-fin` was described as a connection draining timeout after a server is marked down. Corrected the comment because this directive controls half-closed server-side connections, not the drain state timeout.
- The NGINX section implied only NGINX Plus has built-in draining. Updated it to note that NGINX Open Source 1.29.6 and later also support the `drain` parameter.
- The older open-source NGINX workaround used `weight=0` and wrote a second upstream block with the same name, which is not the documented way to remove a server and can create duplicate upstream configuration. Changed the example to update the existing upstream config, mark the server `down`, and gracefully reload NGINX.
- The AWS ALB example set `deregistration_delay.connection_termination.enabled`, which AWS documents as Network Load Balancer-only. Removed that attribute from the ALB sample and kept the ALB-supported `deregistration_delay.timeout_seconds`.
- The Kubernetes preStop hook sent SIGTERM to PID 1 inside the preStop command. Kubernetes runs preStop before sending TERM, and the grace period includes both preStop and application shutdown. Removed the manual SIGTERM and left the hook as a propagation delay before Kubernetes sends TERM.
- The Python graceful shutdown example used single-threaded `HTTPServer` while tracking active concurrent requests. Changed it to `ThreadingHTTPServer` so the active request count reflects concurrent in-flight requests.

## Review Notes
- Python code blocks were syntax-checked successfully with Python 3.
- The Go code block was reviewed against the official `net/http` documentation, but it was not compiled locally because the `go` toolchain is not installed in this environment.
- The HAProxy drain script assumes the `show stat` CSV field layout where `scur` is field 5; this is consistent with common HAProxy stats output, but production scripts should parse the CSV header for resilience.
