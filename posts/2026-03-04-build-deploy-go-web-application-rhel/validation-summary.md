# Validation Summary: How to Build and Deploy a Go Web Application on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go modules
- RHEL
- dnf
- systemd
- Nginx
- firewalld
- SELinux

## Sources Consulted
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go modules `go.mod` reference: https://go.dev/doc/modules/gomod-ref
- systemd service unit documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd execution environment and sandboxing documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Go Toolset documentation: https://docs.redhat.com/en/documentation/red_hat_developer_tools/1/html/using_go_1.23_toolset/go-toolset

## Issues Found
No technical issues found.

## Review Notes
The systemd unit syntax was also checked locally with `systemd-analyze verify`; the only reported problem was that `/usr/local/bin/webapp` does not exist in the review environment, which is expected because the deployment steps install that binary on the target host.
