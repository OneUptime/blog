# Validation Summary: How to Fix 'Compute Engine' SSH Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Cloud Compute Engine
- Google Cloud CLI (`gcloud`)
- Identity-Aware Proxy TCP forwarding
- VPC firewall rules
- OS Login and IAM roles
- SSH key metadata
- Compute Engine serial console
- Linux OpenSSH service repair

## Sources Consulted
- Google Cloud: Troubleshooting SSH errors: https://docs.cloud.google.com/compute/docs/troubleshooting/troubleshooting-ssh-errors
- Google Cloud: `gcloud compute ssh` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/ssh
- Google Cloud: Using IAP for TCP forwarding: https://docs.cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud: Best practices for controlling SSH login access: https://docs.cloud.google.com/compute/docs/connect/ssh-best-practices/login-access
- Google Cloud: Add SSH keys to VMs: https://docs.cloud.google.com/compute/docs/connect/add-ssh-keys
- Google Cloud: Predefined metadata keys: https://docs.cloud.google.com/compute/docs/metadata/predefined-metadata-keys
- Google Cloud: Set and remove custom metadata: https://docs.cloud.google.com/compute/docs/metadata/setting-custom-metadata
- Google Cloud: Troubleshooting using the serial console: https://docs.cloud.google.com/compute/docs/troubleshooting/troubleshooting-using-serial-console
- Google Cloud: `gcloud compute connect-to-serial-port` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/connect-to-serial-port
- Google Cloud: `gcloud compute instances add-access-config` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/add-access-config

## Issues Found
- IAP tunneling instructions omitted the IAM permission needed to create IAP TCP tunnels. Added a `roles/iap.tunnelResourceAccessor` IAM binding example.
- The IAP firewall rule used `--target-tags=allow-ssh-iap` but did not add that network tag to the VM, so the rule would not apply to the instance. Added the matching `gcloud compute instances add-tags` command.
- Manual SSH key metadata examples could be read as safely appending a key, but `--metadata-from-file=ssh-keys=...` updates the entire `ssh-keys` metadata value. Added comments telling readers to include existing keys in the file.
- Interactive serial console instructions showed `connect-to-serial-port` without first enabling serial port access. Added the required `serial-port-enable=TRUE` metadata command.

## Review Notes
- The main troubleshooting flow, Compute Engine SSH commands, OS Login roles, IAP source range `35.235.240.0/20`, host key cleanup, and startup script approach are technically valid.
- The firewall debugging script lists SSH firewall rules in the network but does not prove that each rule applies to the instance's tags or service account. This is acceptable as a broad diagnostic, but a future revision could make the script more precise.
