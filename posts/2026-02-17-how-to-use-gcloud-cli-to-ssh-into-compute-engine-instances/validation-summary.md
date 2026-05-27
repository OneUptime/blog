# Validation Summary: How to Use gcloud CLI to SSH into Compute Engine Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud CLI
- Compute Engine
- SSH
- Identity-Aware Proxy TCP forwarding
- OS Login
- Compute Engine metadata
- Compute Engine serial console

## Sources Consulted
- Google Cloud CLI reference: `gcloud compute ssh` - https://cloud.google.com/sdk/gcloud/reference/compute/ssh
- Google Cloud CLI reference: `gcloud compute config-ssh` - https://cloud.google.com/sdk/gcloud/reference/compute/config-ssh
- Compute Engine: Connect to Linux VMs - https://cloud.google.com/compute/docs/connect/standard-ssh
- Compute Engine SSH connections overview - https://cloud.google.com/compute/docs/instances/ssh
- Compute Engine: Add SSH keys to VMs - https://cloud.google.com/compute/docs/connect/add-ssh-keys
- Compute Engine: Set and remove custom metadata - https://cloud.google.com/compute/docs/metadata/setting-custom-metadata
- Identity-Aware Proxy: Using IAP for TCP forwarding - https://cloud.google.com/iap/docs/using-tcp-forwarding
- Identity-Aware Proxy: TCP forwarding overview - https://cloud.google.com/iap/docs/tcp-forwarding-overview
- Compute Engine: Set up OS Login - https://cloud.google.com/compute/docs/oslogin/set-up-oslogin
- Compute Engine: Troubleshooting SSH errors - https://cloud.google.com/compute/docs/troubleshooting/troubleshooting-ssh-errors
- Google Cloud CLI reference: `gcloud compute connect-to-serial-port` - https://cloud.google.com/sdk/gcloud/reference/compute/connect-to-serial-port
- Compute Engine: Troubleshooting using the serial console - https://cloud.google.com/compute/docs/troubleshooting/troubleshooting-using-serial-console

## Issues Found
- The IAP firewall rule example used `--target-tags=allow-iap-ssh` but did not state that the VM must have the matching network tag. Added a sentence clarifying that requirement.
- The basic SSH example implied that gcloud always resolves the zone automatically. Updated the wording to match the current CLI behavior: omitting `--zone` depends on default properties or an interactive prompt.
- The SSH key removal example was labeled as removing a specific SSH key, but `gcloud compute project-info remove-metadata --keys=ssh-keys` removes the entire project-level `ssh-keys` metadata value. Updated the comment and explanation.
- The "Permission Denied" troubleshooting command claimed to reset the SSH key by using `--ssh-key-expire-after` and `--force-key-file-overwrite`, but those flags do not generally reset access and `--force-key-file-overwrite` only regenerates broken local key files. Replaced the example with the official `--troubleshoot` diagnostic command.
- The serial console section omitted the required `serial-port-enable=true` metadata prerequisite. Added the `gcloud compute instances add-metadata` command before the connection command.
- The serial console explanation said it bypasses the network entirely. Updated the wording to clarify that serial console access does not depend on the guest OS network path.

## Review Notes
The remaining commands and explanations are consistent with current Google Cloud documentation. The local workspace did not have the `gcloud` binary installed, so CLI flags were validated against official Google Cloud CLI reference documentation rather than local `--help` output.
