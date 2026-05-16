# Validation Summary: How to Set Up Talos Linux on CloudStack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Apache CloudStack
- CloudMonkey (`cmk`)
- Kubernetes
- CloudStack CSI driver
- KVM/QCOW2/RAW virtual machine images

## Sources Consulted
- Talos Linux CloudStack installation guide: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/cloud-platforms/cloudstack
- Talos Linux getting started guide: https://docs.siderolabs.com/talos/v1.13/getting-started/getting-started
- Talos Linux support matrix: https://www.talos.dev/latest/introduction/support-matrix/
- Apache CloudStack CloudMonkey usage documentation: https://github-wiki-see.page/m/apache/cloudstack-cloudmonkey/wiki/Usage
- Apache CloudStack `registerTemplate` API reference: https://cloudstack.apache.org/api/apidocs-4.19/apis/registerTemplate.html
- Apache CloudStack `deployVirtualMachine` API reference: https://cloudstack.apache.org/api/apidocs-4.19/apis/deployVirtualMachine.html
- Apache CloudStack `createLoadBalancerRule` API reference: https://cloudstack.apache.org/api/apidocs-4.19/apis/createLoadBalancerRule.html
- Apache CloudStack CSI driver documentation: https://docs.cloudstack.apache.org/en/latest/plugins/cloudstack-csi-driver.html
- CloudStack CSI driver README: https://github.com/cloudstack/cloudstack-csi-driver/blob/main/README.md

## Issues Found
- The post installed CloudMonkey with `pip install cloudmonkey` while using the modern `cmk` command. Updated the install example to download the current `cmk` binary from the Apache CloudStack CloudMonkey releases.
- The post used the Talos `nocloud` image for CloudStack. Updated the image example to use the Talos Image Factory CloudStack image (`cloudstack-amd64.raw.gz`), which is the documented CloudStack platform image.
- The post used Talos v1.9.0 throughout. Updated the sample Talos image/template/installer references to v1.13.0 because v1.9 is no longer current as of the validation date.
- The CloudStack CSI `StorageClass` example used non-documented parameter keys. Updated it to use `csi.cloudstack.apache.org/disk-offering-id` and `volumeBindingMode: WaitForFirstConsumer`, as documented by the CloudStack CSI driver.
- The troubleshooting section implied KVM only uses QCOW2. Updated it to note that CloudStack's template API supports RAW and QCOW2 for KVM.

## Review Notes
The guide remains a high-level CloudStack deployment walkthrough. A future improvement would be to show passing Talos machine configuration through the CloudStack `userdata` field during `deploy virtualmachine`, which is the approach used in the official Talos CloudStack guide.
