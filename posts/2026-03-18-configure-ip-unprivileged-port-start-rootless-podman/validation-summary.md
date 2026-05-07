# Validation Summary: How to Configure net.ipv4.ip_unprivileged_port_start for Rootless Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel sysctl
- net.ipv4.ip_unprivileged_port_start
- Rootless Podman
- Podman port publishing
- systemd-sysctl and sysctl.d
- Nginx container image

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- systemd sysctl.d documentation: https://www.freedesktop.org/software/systemd/man/sysctl.d.html
- systemd-sysctl.service documentation: https://www.freedesktop.org/software/systemd/man/systemd-sysctl.service.html
- NGINX Docker deployment documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/
- Local sysctl help output: `sysctl --help`

## Issues Found
- The verification example mapped `443:443` for the stock `nginx` image and tested `https://localhost:443`. The official nginx container image serves HTTP on port 80 by default, so this would not verify binding host port 443 unless TLS and a listener on container port 443 were configured. Changed the example to map host port 443 to container port 80 with `-p 443:80` and test `http://localhost:443`.
- The post said the `99-` sysctl.d prefix "ensures" the file loads after other configuration files. systemd sorts sysctl.d files lexicographically, so `99-` makes the file load late, but later names or higher-precedence runtime inputs can still override it. Changed the wording to say it loads late and can override earlier files.

## Review Notes
Podman was not installed in the local environment, so Podman CLI syntax was verified against official Podman documentation rather than local `podman --help` output. The `sysctl -w` and `sysctl --system` commands were checked against local `sysctl --help`, and the sysctl parameter behavior was checked against Linux kernel documentation.
