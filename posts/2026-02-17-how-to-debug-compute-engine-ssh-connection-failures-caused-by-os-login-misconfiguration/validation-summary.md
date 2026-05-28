# Validation Summary: Debug Compute Engine SSH Connection Failures Caused by OS Login Misconfiguration

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Cloud Compute Engine
- OS Login
- Google Cloud IAM
- Google Cloud CLI (`gcloud`)
- Identity-Aware Proxy TCP forwarding
- Linux SSH daemon and guest environment packages
- Linux NSS configuration

## Sources Consulted
- Google Cloud documentation: Set up OS Login - https://docs.cloud.google.com/compute/docs/oslogin/set-up-oslogin
- Google Cloud documentation: Troubleshooting OS Login - https://docs.cloud.google.com/compute/docs/troubleshooting/troubleshoot-os-login
- Google Cloud documentation: Troubleshooting SSH errors - https://docs.cloud.google.com/compute/docs/troubleshooting/troubleshooting-ssh-errors
- Google Cloud documentation: Using IAP for TCP forwarding - https://docs.cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud documentation: Install the guest environment - https://docs.cloud.google.com/compute/docs/images/install-guest-environment
- Google Cloud documentation: Guest environment - https://docs.cloud.google.com/compute/docs/images/guest-environment
- Google Cloud CLI reference: gcloud compute instances describe - https://cloud.google.com/sdk/gcloud/reference/compute/instances/describe
- Google Cloud CLI reference: gcloud compute connect-to-serial-port - https://cloud.google.com/sdk/gcloud/reference/compute/connect-to-serial-port

## Issues Found
- Clarified OS Login metadata precedence. Instance metadata set to `FALSE` disables OS Login even when project metadata is `TRUE`, and project metadata applies when the instance value is empty.
- Added missing IAM role caveats. Users connecting to VMs with service accounts can also need `roles/iam.serviceAccountUser`, IAP SSH users need `roles/iap.tunnelResourceAccessor`, and external-user cases can need additional organization-level access.
- Clarified OS Login 2FA behavior. OS Login 2FA requires both OS Login and OS Login 2FA metadata to be `TRUE`, and 2FA is not enforced for service account users.
- Corrected serial console guidance. `gcloud compute connect-to-serial-port` requires serial port access to be enabled with `serial-port-enable=true` metadata.
- Made SSH daemon log lookup more portable by checking both `ssh` and `sshd` systemd units.

## Review Notes
The core troubleshooting sequence and commands are technically valid. The local environment did not have `gcloud` installed, so CLI verification used official Google Cloud CLI reference documentation instead of local `--help` output.
