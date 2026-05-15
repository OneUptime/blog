# Validation Summary: How to Deploy k3s Lightweight Kubernetes on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- k3s
- Kubernetes
- systemd
- firewalld
- DNF

## Sources Consulted
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Advanced Options / SELinux Support: https://docs.k3s.io/advanced
- K3s Stopping and Restarting Service: https://docs.k3s.io/upgrades/killall
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Red Hat Enterprise Linux DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_software_with_the_dnf_tool/index

## Issues Found
- The original post used placeholder commands such as `dnf install -y <package-name>`, `/etc/<service>/config.conf`, `systemctl enable --now <service>`, and `<service> --test`. Replaced them with real k3s installation, configuration, systemd, and verification commands from the official k3s documentation.
- The original dependency step installed `epel-release` and `"Development Tools"`, which are not required by the official k3s quick-start flow. Replaced this with `curl`, which is needed to run the official install script, and added the RHEL 10 `kernel-modules-extra` requirement from the k3s requirements page.
- The original configuration file path was generic and incorrect for k3s. Replaced it with `/etc/rancher/k3s/config.yaml` and a valid YAML example using documented k3s configuration keys.
- The original service management commands did not account for the k3s installer creating and starting the `k3s` systemd service. Updated the commands to enable and restart `k3s` so configuration file edits are applied.
- The original firewall example used `--add-service=<service>`, which is not a valid k3s firewalld service definition. Replaced it with the documented k3s API server port and default pod/service CIDR trusted-zone rules.
- The original security guidance recommended running the service as a non-root user and enabling TLS generically. Updated it to k3s-specific guidance for protecting the kubeconfig and using `tls-san` when the API server is accessed by DNS name or load balancer.

## Review Notes
The post is now technically valid for a basic single-node k3s server installation on RHEL. For future expansion, the guide could add multi-node agent joins, SELinux enforcement with `selinux: true`, and air-gapped installation details, but those are outside the current post structure.
