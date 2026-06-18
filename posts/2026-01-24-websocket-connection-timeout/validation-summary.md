# Validation Summary: How to Fix 'Connection Timeout' WebSocket Errors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket
- Browser JavaScript WebSocket API
- Node.js HTTP/HTTPS servers
- Node.js ws library
- Nginx reverse proxy
- AWS Application Load Balancer
- AWS CloudFormation
- TLS
- Resource Timing API

## Sources Consulted
- WHATWG WebSockets Standard: https://websockets.spec.whatwg.org/
- MDN WebSocket API documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
- MDN PerformanceResourceTiming initiatorType documentation: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/initiatorType
- ws API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- AWS ALB load balancer attributes documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- AWS ALB target group attributes documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS CloudFormation TargetGroupAttribute documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-elasticloadbalancingv2-targetgroup-targetgroupattribute.html
- AWS CloudFormation Listener documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticloadbalancingv2-listener.html

## Issues Found
- The diagnostics example resolved the WebSocket test promise on timeout but left the WebSocket attempt alive, which could later overwrite the timeout result or resolve again. Added a settled guard and close call on timeout.
- The client timeout wrapper could schedule duplicate retries when a connection timeout closed the socket and the `onclose` handler also retried. Added a timeout flag so the timeout path schedules one retry, and reset the flag for later attempts.
- The `sendWithTimeout` example could be called while the connection was still opening and reject immediately. Added an open promise wait with a connection-timeout bound before sending.
- The server-side `ws` example used `new WebSocket.Server({ server })` while also manually calling `wss.handleUpgrade()` in the HTTP server's `upgrade` event. Current `ws` documentation requires choosing either automatic server handling or detached `noServer` handling. Changed the example to `noServer: true`.
- The server-side example used the discouraged `verifyClient` option. Moved verification into the HTTP `upgrade` event, matching current `ws` guidance.
- The message-processing timeout left its timer running after successful processing. Stored and cleared the timer in both success and error paths.
- The Nginx snippet used the deprecated `listen 443 ssl http2` style. Updated it to `listen 443 ssl;` plus `http2 on;` per current Nginx HTTP/2 documentation.
- The AWS CloudFormation sample configured target group stickiness but omitted the ALB idle timeout, which is the load balancer attribute that controls inactive WebSocket connection closure. Added an Application Load Balancer resource with `idle_timeout.timeout_seconds`.
- The AWS CloudFormation HTTPS listener omitted the required default certificate. Added a placeholder `Certificates` block.
- The AWS stickiness comment overstated stickiness as WebSocket-critical. Updated it to clarify that stickiness helps reconnects and related HTTP requests return to the same target.
- The network-aware client called `handleDisconnect()` immediately after closing a timed-out connecting socket, then `onclose` could call it again. Removed the direct call and let `onclose` handle the disconnect flow.
- The Resource Timing example checked for `entry.initiatorType === 'websocket'`, but MDN's documented initiator types do not include `websocket`. Changed the example to match entries by URL when available and added explicit manual connection timing.

## Review Notes
JavaScript examples were syntax-checked locally with Node.js v22.22.0. Nginx was not installed in this environment, so the Nginx snippet was reviewed against official Nginx documentation rather than `nginx -t`. The AWS CloudFormation YAML was reviewed against AWS documentation; no local CloudFormation validator was available.
