# Validation Summary: How to Configure RKE2 Private Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- containerd
- Private container registries
- Harbor
- AWS ECR
- TLS certificate trust stores
- kubectl and crictl

## Sources Consulted
- RKE2 Private Registry Configuration: https://docs.rke2.io/install/private_registry
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Air-Gap Install: https://docs.rke2.io/install/airgap
- Amazon ECR private registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI ecr get-login-password reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes private registry image pull documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- containerd crictl documentation: https://containerd.io/docs/2.1/cri/crictl/
- Ubuntu update-ca-certificates man page: https://manpages.ubuntu.com/manpages/questing/man8/update-ca-certificates.8.html
- Red Hat shared system certificates documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-shared-system-certificates

## Issues Found
- The post used `sudo cat > /etc/rancher/rke2/registries.yaml`, which would not elevate the shell redirection and can fail with permission denied. Changed it to `sudo tee ... > /dev/null` and added `chmod 600` for the credentials file.
- The post did not explicitly state that `registries.yaml` must be present on each node that pulls from the private registry. Updated the wording and command comment to match RKE2 documentation.
- The self-signed certificate command wrote directly to `/etc/ssl/certs/` through an unprivileged redirection. Changed it to pipe through `sudo tee`.
- The RHEL/CentOS trust-store example copied the certificate to the Debian/Ubuntu trust-store path before running `update-ca-trust`. Added the correct `/etc/pki/ca-trust/source/anchors/` path and `update-ca-trust extract`.
- The ECR refresh script creation wrote to `/usr/local/bin` without elevated redirection. Changed it to `sudo tee` and `sudo chmod`.
- The ECR refresh script used `systemctl reload rke2-server` / `rke2-agent`, but RKE2 documentation requires configuring before startup or restarting RKE2 for registry changes to take effect. Changed the script to restart the appropriate RKE2 service.
- The conclusion suggested Kubernetes Secrets as a general way to store registry credentials, which is not accurate for node-level `registries.yaml` credentials. Adjusted the guidance to distinguish node-level credentials from workload image pull credentials.

## Review Notes
The remaining registry schema examples match current RKE2 documentation for `configs`, `auth`, `tls`, `ca_file`, `cert_file`, `key_file`, and `insecure_skip_verify`. The ECR cron-based token refresh approach is workable, but future revisions could mention kubelet credential provider plugins for dynamic cloud registry credentials where available.
