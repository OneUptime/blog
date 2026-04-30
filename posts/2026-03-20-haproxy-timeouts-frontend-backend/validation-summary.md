# Validation Summary: How to Configure HAProxy Timeouts for IPv4 Frontend and Backend Connections

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- HTTP proxy configuration
- WebSocket tunnel configuration
- IPv4 frontend and backend addressing
- Connection timeout tuning

## Sources Consulted
- HAProxy 3.2 Configuration Manual (official): https://docs.haproxy.org/3.2/configuration.html
- HAProxy Documentation Index (official): https://docs.haproxy.org/

## Issues Found
- The lifecycle diagram incorrectly labeled the client-to-frontend TCP connection with `timeout connect`. I removed that label and kept `timeout connect` on the backend server connection, which matches HAProxy's timeout scope.
- The post described `timeout http-request` as covering a full HTTP request. I corrected this to request headers and noted that it also covers the body only when `option http-buffer-request` is enabled.
- The timeout reference table listed `timeout tunnel` as a frontend/backend directive. I corrected it to backend usage and clarified that it applies to upgraded or tunnel connections.
- The WebSocket example placed `timeout client` inside a `backend`, which is not a valid placement for that directive. I removed the invalid line, kept a normal pre-upgrade `timeout server`, and clarified that `timeout tunnel` governs inactivity after the upgrade.
- The keep-alive comment claimed that `timeout http-keep-alive 0` disables keep-alive. I removed that claim and kept the accurate guidance that shorter values free idle connections faster.
- The final takeaway described `timeout client` and `timeout server` like total response timers. I clarified that they should be sized for expected inactivity and processing time.
- The final takeaway recommended `timeout tunnel` with large or zero values for WebSocket and SSE connections. I narrowed this to a large inactivity value for WebSocket and other upgraded tunnel connections.

## Review Notes
- Exact timeout values still depend on application behavior and network conditions; the official manual recommends short backend connect timeouts with enough headroom for retransmits.
- Local syntax validation with `haproxy -c` was not possible in this environment because the `haproxy` binary is not installed.
