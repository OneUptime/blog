# Validation Summary: How to Configure HAProxy ACLs for Content-Based Routing on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- HAProxy
- HAProxy ACLs
- HTTP content-based routing
- systemd service reloads

## Sources Consulted
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy ACL configuration tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/acls/
- Red Hat Enterprise Linux 9.7 Release Notes, HAProxy rebased to 2.8: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.7_release_notes/

## Issues Found
- The cookie ACL example used `cook(ab_test)`. In current HAProxy documentation, `cook()` is deprecated in favor of `req.cook()`, so the example and matching function table were updated to use `req.cook(ab_test)` and `req.cook(name)`.

## Review Notes
- The examples use valid HAProxy ACL condition syntax for hostname, path prefix, path suffix, method, header substring, regular expression, source IP, file-backed ACLs, `http-request deny`, and `use_backend` routing.
- The post contains illustrative snippets; several later snippets omit backend definitions for brevity, so validating them as standalone complete configuration files would require adding the referenced backend sections.
