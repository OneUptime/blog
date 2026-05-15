# Validation Summary: How to Install and Configure OpenShift Local (CRC) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat OpenShift Local / CRC
- Red Hat Enterprise Linux
- OpenShift CLI (`oc`)
- libvirt
- NetworkManager
- OpenShift routes and applications

## Sources Consulted
- CRC documentation: Installing CRC, https://crc.dev/docs/installing/
- CRC documentation: Using CRC, https://crc.dev/docs/using/
- CRC documentation: Configuring CRC, https://crc.dev/docs/configuring/
- CRC documentation: Networking, https://crc.dev/docs/networking/
- CRC documentation: Troubleshooting CRC, https://crc.dev/docs/troubleshooting/
- Red Hat Hybrid Cloud Console OpenShift Local download page, https://console.redhat.com/openshift/create/local

## Issues Found
- The system requirements listed 9 GB+ RAM and allowed a VM with nested virtualization. Current CRC documentation lists 10.5 GB of free memory for the OpenShift preset and says CRC does not support nested virtualization. Updated the requirement text accordingly.
- The RHEL requirement was too broad. Current CRC documentation requires the latest two RHEL minor releases, a host registered with the Red Hat Customer Portal, and `libvirt` plus `NetworkManager` installed. Updated the wording and added the documented `dnf` install command.
- The `crc setup` description said it installs prerequisites such as libvirt. Current documentation says required packages should be installed first and that `crc setup` prepares the host environment. Updated the comment.
- The admin login command parsed `crc console --credentials` output with `grep` and `awk`, which is brittle and omitted the API endpoint. Current documentation shows using the cached `crc-admin` context for admin checks. Replaced it with `oc config use-context crc-admin`.
- The developer login command omitted the API server URL. Updated it to `oc login -u developer -p developer https://api.crc.testing:6443`, matching the documented CRC endpoint.
- The resource configuration section described the default memory as 9 GB. Current CRC documentation lists the default memory property as `10752` MiB. Updated the comment.

## Review Notes
The remaining CRC lifecycle, configuration, DNS, and `oc` examples are consistent with the current CRC documentation. Resource values and command defaults can change between CRC releases, so they should be rechecked when the post is updated for a specific OpenShift Local version.
