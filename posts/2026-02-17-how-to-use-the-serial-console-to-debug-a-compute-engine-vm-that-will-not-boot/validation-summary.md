# Validation Summary: How to Use the Serial Console to Debug a Compute Engine VM That Will Not Boot

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Compute Engine
- Compute Engine serial console and serial port output
- Google Cloud CLI (`gcloud`)
- Cloud Logging serial port logging
- Compute Engine persistent disks and rescue VM workflows
- Linux boot troubleshooting
- Google Cloud IAM and Organization Policy

## Sources Consulted
- Google Cloud Compute Engine: Troubleshooting using the serial console: https://cloud.google.com/compute/docs/troubleshooting/troubleshooting-using-serial-console
- Google Cloud Compute Engine: Viewing serial port output: https://cloud.google.com/compute/docs/troubleshooting/viewing-serial-port-output
- Google Cloud SDK reference: `gcloud compute connect-to-serial-port`: https://cloud.google.com/sdk/gcloud/reference/compute/connect-to-serial-port
- Google Cloud SDK reference: `gcloud compute instances get-serial-port-output`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/get-serial-port-output
- Google Cloud SDK reference: `gcloud compute instances attach-disk`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/attach-disk
- Google Cloud SDK reference: `gcloud compute instances detach-disk`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/detach-disk
- Google Cloud Compute Engine: Detaching and reattaching boot disks: https://cloud.google.com/compute/docs/disks/detach-reattach-boot-disk
- Google Cloud Compute Engine: Use symbolic links to access disks attached to a Linux VM: https://cloud.google.com/compute/docs/disks/disk-symlinks
- Google Cloud SDK reference: `gcloud resource-manager org-policies enable-enforce`: https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/enable-enforce
- Google Cloud Resource Manager: Organization policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints

## Issues Found
- The post said serial port output could "always" be read without enabling the interactive console. Google documentation says serial port output is available while the VM is running and is limited to recent retained output, so the wording was corrected.
- The post said Linux VMs with OS Login enabled can use OS Login credentials at the serial console login prompt. Google documentation states Google-supplied Linux images are not configured for password-based local logins by default, so the wording was changed to refer to guest OS credentials and local password setup.
- The rescue VM example assumed the boot disk name was `my-broken-vm`. Google documentation notes the disk name may be the same as the instance name but is not guaranteed, so the command now uses `BOOT_DISK_NAME`.
- The filesystem repair example assumed the attached disk partition would be `/dev/sdb1`. Google recommends stable `/dev/disk/by-id/google-*` paths for attached disks, so the commands now use `/dev/disk/by-id/google-BOOT_DISK_NAME-part1`.
- The security section described the serial console as providing root-level access and said `roles/compute.instanceAdmin` is needed to connect. This was too broad. The text now describes it as powerful out-of-band access and lists the relevant metadata permissions and SSH key authentication behavior from the official documentation.

## Review Notes
The main `gcloud` serial console, serial output, metadata, serial port logging, boot disk detach/attach, and organization policy commands are current according to the official Google Cloud CLI documentation. The local environment did not have `gcloud` installed, so command verification used the published Google Cloud SDK references instead of local `--help` output.
