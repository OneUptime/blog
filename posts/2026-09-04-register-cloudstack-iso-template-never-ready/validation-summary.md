# Validation Summary: How to Register an ISO or Template That Never Becomes Ready in CloudStack

## Status
validated

## Post Type
Technical troubleshooting guide with CloudMonkey and Linux command examples.

## Technologies Covered
- Apache CloudStack 4.23: ISO/template registration, image stores, System VMs, and asynchronous operations
- CloudMonkey CLI
- KVM, QCOW2, RAW, and direct download
- HTTP/HTTPS, DNS, TLS, and SHA-256 checksums
- NFS secondary storage and Linux diagnostics
- QEMU image inspection and guest integration

## Sources Consulted
- [CloudStack API index](https://cloudstack.apache.org/api/) and [4.23 API reference](https://cloudstack.apache.org/api/apidocs-4.23/).
- [registerIso](https://cloudstack.apache.org/api/apidocs-4.23/apis/registerIso.html) and [registerTemplate](https://cloudstack.apache.org/api/apidocs-4.23/apis/registerTemplate.html): metadata, checksum syntax, architecture, and direct-download parameters.
- [listIsos](https://cloudstack.apache.org/api/apidocs-4.23/apis/listIsos.html), [listTemplates](https://cloudstack.apache.org/api/apidocs-4.23/apis/listTemplates.html), [listSystemVms](https://cloudstack.apache.org/api/apidocs-4.23/apis/listSystemVms.html), and [listImageStores](https://cloudstack.apache.org/api/apidocs-4.23/apis/listImageStores.html): filters, parameters, and response fields.
- [deployVirtualMachine](https://cloudstack.apache.org/api/apidocs-4.23/apis/deployVirtualMachine.html): stopped deployment using startvm=false.
- [Working With Templates](https://docs.cloudstack.apache.org/en/latest/adminguide/templates.html): conventional versus direct download, certificate management, image export, and guest integration.
- [System VMs](https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html): SSH access and diagnostic bundles.
- [Storage Overview](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html): primary and secondary storage workflows.
- [CloudMonkey usage](https://github.com/apache/cloudstack-cloudmonkey/wiki/Usage), [help implementation](https://github.com/apache/cloudstack-cloudmonkey/blob/main/cmd/help.go), and [command dispatch](https://github.com/apache/cloudstack-cloudmonkey/blob/main/cli/exec.go): command syntax, API help, and asynchronous job polling.
- [curl manual](https://curl.se/docs/manpage.html): download, redirect, HTTPS, TLS minimum-version, verbose, and HEAD options.
- [QEMU image utility](https://www.qemu.org/docs/master/tools/qemu-img.html) and [QEMU security documentation](https://www.qemu.org/docs/master/system/security.html): image inspection and isolation principles.
- [OpenSSH ssh manual](https://man.openbsd.org/ssh): identity file and port flags.
- Debian upstream-package manuals: [df](https://manpages.debian.org/bookworm/coreutils/df.1.en.html), [sha256sum](https://manpages.debian.org/bookworm/coreutils/sha256sum.1.en.html), [file](https://manpages.debian.org/bookworm/file/file.1.en.html), [ip-route](https://manpages.debian.org/bookworm/iproute2/ip-route.8.en.html), and [exportfs](https://manpages.debian.org/bookworm/nfs-kernel-server/exportfs.8.en.html).

## Issues Found
1. **Invalid API-help commands.** Replaced `cmk help register iso` and `cmk help register template` with `cmk help registerIso` and `cmk help registerTemplate`. The help handler looks up its first argument as one API name.
2. **Missing bootable ISO metadata.** Added `ostypeid=OS_TYPE_UUID` to the ISO example. Although listed as optional generally, this parameter is required for a bootable ISO.
3. **Unstated filter permissions.** Clarified that `all` image filters require administrator access and that owners can use `self`. `listall=true` does not grant extra permissions.
4. **Overly narrow parser warning.** Extended the existing sandbox guidance to `qemu-img info`, which also parses an image, instead of singling out `qemu-img check`.
5. **NFS-specific diagnostics presented generally.** Qualified the NFS server checks as applying to NFS-backed secondary storage; other providers require their own capacity and access checks.
6. **Guest integration described as scripts-only.** Included cloud-init as an alternative implementation for supported password and SSH-key integration.
7. **Direct download described as template-only.** Noted that the 4.23 ISO registration API also exposes `directdownload`; actual use remains conditional on supported KVM workflows.
8. **Registration and asynchronous transfer conflated.** Clarified that registration returns synchronously while transfer continues, and provided the job-result query for operations that actually return an asynchronous job ID.
9. **Download action confused with retry.** Explained that Download exports an image, and limited retry advice to versions offering an actual retry action.
10. **Conclusion overstated readiness.** Corrected the assertion that Ready always implies completed image transfer. Direct-download readiness can precede fetching the image on a host.

## Review Notes
- Reviewed against the published 4.23 API and administration documentation. The detailed API pages were retrieved directly over HTTPS after the browser fetcher failed to retrieve them.
- Confirmed the checksum prefix, KVM template parameters, diagnostic log path, SSVM SSH key and port, list commands, and startvm=false parameter. The shell snippets were checked for Bash syntax without executing their operational actions.
- The documentation links resolve to appropriate official resources. Image URLs under images.example.net, UUIDs, checksum values, and the NFS export path are illustrative placeholders requiring replacement.
- No CloudStack environment, source image, SSVM, or KVM host was supplied. Registration, connectivity, checksum acceptance, and guest boot were not tested live; validation records documentation and static review, not deployment certification.
- A successful HEAD request or host curl request is diagnostic evidence only: a source can handle HEAD differently from GET, and curl trust configuration can differ from the agent certificate keystore. Deployment remains necessary to validate direct download.
- Keep version-local CloudMonkey help authoritative for the installed service. The linked latest administration and QEMU master documentation can change over time.
