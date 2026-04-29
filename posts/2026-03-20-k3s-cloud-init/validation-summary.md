# Validation Summary: How to Deploy K3s with cloud-init

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- cloud-init
- Terraform
- AWS EC2
- Ubuntu cloud images
- Helm
- cert-manager
- Bash
- YAML

## Sources Consulted
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Environment Variables: https://docs.k3s.io/reference/env-variables
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Agent CLI Reference: https://docs.k3s.io/cli/agent
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- cloud-init user-data formats: https://docs.cloud-init.io/en/24.3/explanation/format.html
- cloud-init final_message example: https://docs.cloud-init.io/en/latest/reference/yaml_examples/final_message.html
- cloud-init status documentation: https://docs.cloud-init.io/en/latest/howto/status.html
- cloud-init analyze documentation: https://docs.cloud-init.io/en/latest/topics/analyze.html
- cloud-init write_files example: https://docs.cloud-init.io/en/latest/reference/yaml_examples/write_files.html
- Ubuntu on AWS image discovery: https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/
- AWS EC2 AMI documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html
- Helm installation docs: https://helm.sh/docs/faq/installing/
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/

## Issues Found
- The server example wrote `K3S_TOKEN` into `/etc/systemd/system/k3s.service.env`, but the install example itself did not pass that token through the installer. I moved the token into `/etc/rancher/k3s/config.yaml`, which K3s documents as the configuration source loaded by the service.
- The agent example installed K3s without `K3S_URL` or `INSTALL_K3S_EXEC="agent"`, which would default the installer to server mode. I changed the install command to use `INSTALL_K3S_EXEC="agent"` so the node is actually provisioned as an agent.
- The post pinned `v1.29.3+k3s1` throughout. That version line is outdated as of April 29, 2026, so I replaced those commands with `INSTALL_K3S_CHANNEL=stable`, which is the documented production-oriented channel.
- Both `final_message` examples used `$UPTIME`. cloud-init documents the placeholder as `$uptime`, so I corrected both snippets.
- Step 3 described the example as multipart MIME, but the code only generated a single `#cloud-config` file via heredoc. I renamed the step and intro sentence to match what the example actually does.
- The Terraform example hard-coded `ami-0c55b159cbfafe1f0` and labeled it Ubuntu 22.04. AMIs are region-specific, and that AMI ID is not a portable Ubuntu 22.04 identifier. I replaced it with Canonical's public SSM parameter for the latest Ubuntu 22.04 AMI and added the missing token generation resource used by the example.
- The cert-manager installation example used the older `installCRDs=true` setting. I updated it to `crds.enabled=true` and aligned the repository add command with the current legacy-repository example in the official cert-manager docs.
- The Step 5 Helm install command used plain `curl` without fail-fast flags. I changed it to `curl -fsSL` so a failed download does not silently pipe bad content into `bash`.
- The `cloud-init analyze show` comment said it would show “all modules that ran.” I adjusted the wording to “execution timeline,” which matches the cloud-init documentation more closely.
- The agent completion message implied the node was already connected. After removing the pre-install availability loop, I changed the message so it only claims the service was installed and started.

## Review Notes
- The examples assume Ubuntu-style cloud images in a few places, especially the `/home/ubuntu` kubeconfig copy steps and the Canonical Ubuntu AMI lookup in Terraform.
- The Terraform section still assumes you will create a matching `cloud-init-agent.yaml.tpl`; only the server template is shown inline.
- The `kubectl apply -k https://github.com/your-org/k3s-apps//overlays/production` URL is clearly a placeholder and must be replaced with a real repository before use.
- `INSTALL_K3S_CHANNEL=stable` avoids pin drift, but it also means future installs follow the current stable channel instead of a fixed patch release.
