# Validation Summary: How to Install and Configure k9s Terminal UI for Kubernetes on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- k9s
- Kubernetes
- kubectl
- DNF/RPM package installation

## Sources Consulted
- k9s official installation documentation: https://k9scli.io/topics/install/
- k9s official configuration documentation: https://k9scli.io/topics/config/
- k9s official GitHub README command-line documentation: https://github.com/derailed/k9s#the-command-line
- k9s official GitHub latest release assets: https://github.com/derailed/k9s/releases/latest
- Kubernetes official kubeconfig documentation: https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/

## Issues Found
- The original installation command used the placeholder `sudo dnf install -y <package-name>`, which was not a working k9s installation command. Replaced it with a RHEL-compatible installation from the official k9s GitHub RPM release asset.
- The original post described k9s as a systemd service with `/etc/<service>/config.conf`, `systemctl`, and `journalctl` commands. k9s is a terminal UI application, not a service. Replaced those commands with kubeconfig checks, `k9s info`, `k9s`, `k9s --kubeconfig`, and `k9s version`.
- The original verification and troubleshooting sections checked placeholder service status and logs. Replaced them with Kubernetes API access checks, k9s runtime path inspection, RPM package verification, and kubeconfig troubleshooting.
- The prerequisites did not state that `kubectl` and a valid kubeconfig are needed for the verification steps. Added those requirements.
- The conclusion still referred to monitoring a service. Updated it to refer to reviewing k9s logs.

## Review Notes
k9s currently publishes RPM assets for multiple Linux architectures. The post uses the x86_64/amd64 RPM URL and notes that users on other architectures should select the matching RPM.
