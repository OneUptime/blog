# Validation Summary: How to Use the Kickstart Generator to Build Custom Installation Profiles on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Anaconda installer
- Kickstart configuration files
- pykickstart tools (`ksvalidator`, `ksverdiff`, `ksflatten`)
- firewalld offline configuration
- systemd service enablement

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Creating Kickstart files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/creating-kickstart-files_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Kickstart commands and options reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Pykickstart documentation: Kickstart syntax and `%include`: https://pykickstart.readthedocs.io/en/latest/kickstart-docs.html
- pykickstart `ksvalidator` manual page: https://www.mankier.com/1/ksvalidator
- pykickstart `ksverdiff` manual page: https://www.mankier.com/1/ksverdiff
- pykickstart `ksflatten` manual page: https://www.mankier.com/1/ksflatten
- firewalld `firewall-offline-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-offline-cmd.html

## Issues Found
- The `ksvalidator` example used `ksvalidator --version RHEL9 kickstart.cfg`. Red Hat's RHEL 9 documentation shows `ksvalidator -v RHEL9 /path/to/kickstart.ks`, so the example was changed to `ksvalidator -v RHEL9 kickstart.cfg`.
- The network installation source text said to use a local mirror or Red Hat CDN with a direct `url` command. RHEL 9 uses the `rhsm` Kickstart command for CDN-backed installations, while `url` is appropriate for an HTTP/HTTPS installation source such as a local mirror or Satellite-published repository. The wording was corrected and a short note about `rhsm` was added.
- The modular base example used `keyboard us`, but the RHEL 9 Kickstart syntax requires `keyboard --vckeymap` or `keyboard --xlayouts`. The example was changed to `keyboard --xlayouts='us'`.
- A profile comment said `RHEL.3`, which appears to be a version typo. It was corrected to `RHEL 9.3`.

## Review Notes
The post is technically relevant and now aligns with RHEL 9 Kickstart syntax. `ksvalidator` validates Kickstart syntax and deprecated/removed commands, but Red Hat notes that it does not validate `%pre`, `%post`, or `%packages` contents and cannot guarantee a successful installation; the post's recommendation to test in a VM remains important.
