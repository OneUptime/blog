# Validation Summary: How to Diagnose a Secondary Storage VM That Cannot Download System Templates

## Status
validated

## Post Type
Technical troubleshooting guide with CloudMonkey, Linux, NFS, and CloudStack administration commands.

## Technologies Covered
- Apache CloudStack and CloudMonkey
- Secondary Storage VMs and System VM templates
- KVM and x86_64/aarch64 architectures
- NFS and Linux storage diagnostics
- DNS, HTTP/HTTPS, curl, SSH, and certificate trust

## Sources Consulted
- CloudStack System VM guide, including bootstrap recovery, architecture support, SSH access, and diagnostics: https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html
- CloudStack management-server installation and 4.23 template selectors: https://docs.cloudstack.apache.org/en/latest/installguide/management-server/
- CloudStack storage guide: https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html#secondary-storage
- CloudStack secondary-storage configuration: https://docs.cloudstack.apache.org/en/latest/installguide/configuration.html#add-secondary-storage
- CloudStack downloads endpoint: https://cloudstack.apache.org/downloads.html
- CloudMonkey project and CLI syntax: https://github.com/apache/cloudstack-cloudmonkey
- Official API references: https://cloudstack.apache.org/api/apidocs-4.22/apis/listZones.html ; https://cloudstack.apache.org/api/apidocs-4.22/apis/listHypervisors.html ; https://cloudstack.apache.org/api/apidocs-4.22/apis/listSystemVms.html ; https://cloudstack.apache.org/api/apidocs-4.22/apis/listImageStores.html ; https://cloudstack.apache.org/api/apidocs-4.22/apis/listTemplates.html
- Apache setup utility implementation: https://github.com/apache/cloudstack/blob/main/client/bindir/cloud-setup-management.in
- Apache manual seeding helper implementation: https://github.com/apache/cloudstack/blob/main/scripts/storage/secondary/cloud-install-sys-tmplt
- curl command-line reference: https://curl.se/docs/manpage.html
- NFS utilities manuals: https://man7.org/linux/man-pages/man8/showmount.8.html ; https://man7.org/linux/man-pages/man5/nfs.5.html ; https://man7.org/linux/man-pages/man8/exportfs.8.html

## Issues Found
1. The curl range request did not guarantee a small download: servers can ignore Range. Replaced it with a timed HEAD request, retaining certificate verification and explaining that HEAD success does not validate GET behavior.
2. The setup workflow was described as though it mounted and seeded secondary storage. Clarified that it downloads local artifacts, while registration and seeding occur separately. Corrected the manual-recovery condition and its heading accordingly.
3. Setup exit status alone was insufficient evidence of a successful download. Added console/setup-log inspection because the implementation catches download failures and prints errors without necessarily returning a failing process status.
4. The NFS example negotiated its version despite instructing readers to match CloudStack's options. Explained the necessary option adjustment, the intentional read-only override, and the limitations of showmount on NFSv4-only servers. Scoped mount/write claims to NFS stores.
5. Removed unconditional `-F` and explained destructive replacement behavior. Added database/dependency requirements for helper hosts and the architecture-blind default lookup caveat, so the placeholder command is no longer presented as automatically selecting a matching record.

## Review Notes
- Confirmed the repository property, documented bootstrap recovery paths, KVM architecture distinction, diagnostics bundle, SSH port/key, API inventory parameters, and web-encryption secret requirement.
- The retrieved latest documentation identifies itself as CloudStack 4.23.0.0 and documents the shown selectors. API parameter checks used the published 4.22 reference; operators should synchronize CloudMonkey with their installed server and inspect locally packaged help.
- Upstream main-branch source was used to resolve implementation details. Packaged release behavior remains authoritative. Latest documentation contains older template examples, so choose the template required by the installed release rather than assuming its image version must equal the management-server version.
- NFS service names and available Linux tools depend on the distribution. A read-only infrastructure-host mount does not demonstrate SSVM write access; the recovery transfer remains the operational check.
- Documentation links resolved, although the downloads endpoint returned no extractable page body. Placeholder repository URLs and UUIDs are intentionally non-executable examples.
- Verified shell-block syntax with bash and parsed validation.json. No CloudStack deployment, NFS mounts, service changes, or real template transfers were executed; this is a documentation/source review, not an integration test.
