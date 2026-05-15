# Validation Summary: How to Create a Custom RHEL Installation ISO Using Lorax and Kickstart

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Anaconda Kickstart
- lorax
- mkksiso
- createrepo_c
- libvirt virt-install testing

## Sources Consulted
- Red Hat Enterprise Linux 9 Automatically installing RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat Enterprise Linux 9 Customizing Anaconda: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/customizing_anaconda/Red_Hat_Enterprise_Linux-9-Customizing_Anaconda-en-US.pdf
- Lorax mkksiso documentation: https://weldr.io/lorax/mkksiso.html
- Lorax command documentation: https://weldr.io/lorax/f37-branch/lorax.html
- Red Hat Enterprise Linux 9 Image Builder repository documentation for createrepo_c: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/managing-repositories_composing-a-customized-rhel-system-image

## Issues Found
- The post described `lorax` as creating a full installation ISO with package payload repositories. Updated the wording to clarify that `lorax` creates the Anaconda installer boot image and installer tree metadata, including `images/boot.iso`, while installed-system package payloads must come from a DVD, network repository, or an added repository.
- The decision diagram implied that `lorax` is the right path for adding custom packages to the ISO. Updated it to frame `lorax` as the path for a custom installer runtime.
- The `mkksiso` explanation stated that it adds `inst.ks=cdrom:/ks.cfg`. Updated this to the more accurate behavior: `mkksiso` adds an `inst.ks=` argument pointing to the embedded Kickstart file.
- The lorax rebuild instructions manually used `genisoimage`, `isohybrid`, and `implantisomd5` on the lorax output tree. Replaced this with copying the generated `/root/rhel9-lorax-output/images/boot.iso`, which is the output documented by lorax.
- The lorax path reused a Kickstart with `cdrom`, which is correct for a full DVD ISO but not for a lorax boot ISO without package payloads. Added a note to use a valid network or other install tree source when booting from a lorax-generated boot ISO.
- The custom repository example used `createrepo`; RHEL 9 documentation uses `createrepo_c`. Updated the package installation and metadata generation commands.
- The custom package section vaguely said to reference the repo in lorax or copy it into the ISO tree. Updated it to use `mkksiso --add` and the installer-visible `file:///run/install/repo/...` path documented by mkksiso.

## Review Notes
The Kickstart commands, `mkksiso --ks`, `mkksiso --cmdline`, `%include` with `%pre`, `virt-install`, and USB writing examples are technically plausible for RHEL 9. The sample partitioning remains intentionally generic; production Kickstarts should usually restrict destructive storage commands such as `clearpart --all` to expected disks.
