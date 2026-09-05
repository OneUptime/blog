# Validation Summary: How to Create a Reusable CloudStack Template from a VM Root Volume

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Apache CloudStack 4.23 template, volume, VM lifecycle, and permissions APIs
- Apache CloudMonkey CLI
- KVM and VM image storage
- cloud-init and Linux machine identity
- SSH host keys and public-key injection
- systemd and iproute2 diagnostics

## Sources Consulted
- Apache CloudStack template administration: https://docs.cloudstack.apache.org/en/latest/adminguide/templates.html
- Apache CloudStack storage administration: https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html
- CloudStack 4.23 createTemplate API: https://cloudstack.apache.org/api/apidocs-4.23/apis/createTemplate.html
- CloudStack 4.23 deployVirtualMachine API: https://cloudstack.apache.org/api/apidocs-4.23/apis/deployVirtualMachine.html
- CloudStack 4.23 stopVirtualMachine API: https://cloudstack.apache.org/api/apidocs-4.23/apis/stopVirtualMachine.html
- CloudStack 4.23 listVirtualMachines API: https://cloudstack.apache.org/api/apidocs-4.23/apis/listVirtualMachines.html
- CloudStack 4.23 listVolumes API: https://cloudstack.apache.org/api/apidocs-4.23/apis/listVolumes.html
- CloudStack 4.23 listOsTypes API: https://cloudstack.apache.org/api/apidocs-4.23/apis/listOsTypes.html
- CloudStack 4.23 listTemplates API: https://cloudstack.apache.org/api/apidocs-4.23/apis/listTemplates.html
- CloudStack 4.23 queryAsyncJobResult API: https://cloudstack.apache.org/api/apidocs-4.23/apis/queryAsyncJobResult.html
- CloudStack 4.23 updateTemplatePermissions API: https://cloudstack.apache.org/api/apidocs-4.23/apis/updateTemplatePermissions.html
- Official Apache website repository containing the 4.23 API reference (used when browser retrieval failed): https://github.com/apache/cloudstack-www/tree/main/static/api/apidocs-4.23/apis
- CloudMonkey usage and asynchronous execution: https://github.com/apache/cloudstack-cloudmonkey/wiki/Usage
- cloud-init clean and status commands: https://docs.cloud-init.io/en/latest/reference/cli.html#clean
- cloud-init first-boot determination: https://docs.cloud-init.io/en/latest/explanation/first_boot.html
- cloud-init CloudStack datasource: https://docs.cloud-init.io/en/latest/reference/datasources/cloudstack.html
- Upstream iproute2 manual, ip: https://man7.org/linux/man-pages/man8/ip.8.html
- Upstream iproute2 manual, ss: https://man7.org/linux/man-pages/man8/ss.8.html
- Upstream systemd manual, systemctl: https://man7.org/linux/man-pages/man1/systemctl.1.html

## Issues Found
1. **Manual async polling lacked the required CloudMonkey setting.** CloudMonkey normally waits for asynchronous API completion. Added `cmk set asyncblock false` before the first asynchronous operation and explained the default so the subsequent job-ID polling examples match the CLI behavior.
2. **Identity validation required all injected credentials and addresses to be globally unique.** SSH public keys can intentionally authorize access to multiple VMs, and IP/MAC collision requirements depend on network scope. Changed the validation criteria to require unique machine IDs, instance IDs, and SSH host keys, no address collisions within the relevant network, correct requested credentials, and no retained builder secrets.
3. **Template sharing scope was imprecise.** Replaced “project/domain scope” with specific accounts in the owner's domain or projects the owner belongs to. Added the documented restriction that project-owned templates cannot be shared outside their project.

## Review Notes
- Reviewed against the published 4.23 API reference. The createTemplate metadata, ROOT-volume filter, templatefilter=self, deployment arguments, and singular keypair parameter are supported; no replacement with keypairs is required.
- Confirmed the stopped-VM/root-volume workflow, snapshot alternative, template readiness check, secondary-storage role, and guest capability flags against Apache documentation.
- Confirmed cloud-init cleanup flags and cache-based first-boot behavior. Cleanup is not a general secret scrub; the post correctly calls for distribution-specific cleanup and testing. The machine-id option prepares the image for identity generation on its next boot.
- Guest diagnostic commands are appropriate for a Linux guest with systemd, iproute2, and cloud-init. Process details from ss may require root privileges for sockets owned by other users.
- The commands contain deployment-specific placeholders. An authenticated CloudMonkey profile, suitable offering/network, and registered validation key pair are prerequisites. API help should reflect the connected server's version; firmware and guest-agent compatibility still require deployment testing.
- The five documentation links point to the intended resources. Some browser fetches failed; direct HTTP retrieval and the official Apache website source provided the API and first-boot documentation instead.
- Validation was a documentation and syntax review, not execution against a live CloudStack environment. Boot, SSH injection, migration, HA, storage capacity, and uniqueness tests must be run in the target environment.
- Preserved the post's structure and limited edits to the three correctness issues above.
