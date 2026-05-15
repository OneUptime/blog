# Validation Summary: How to Set Up Jenkins Pipelines for RHEL RPM Builds

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RPM packaging and spec files
- rpmbuild and rpmlint
- mock chroot builds
- Jenkins Declarative Pipeline
- DNF repositories and createrepo_c

## Sources Consulted
- Red Hat Enterprise Linux 9 Packaging and distributing software: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/packaging_and_distributing_software/index
- Red Hat Enterprise Linux 9 repository creation with createrepo_c: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images/managing-repositories_composing-installing-managing-rhel-for-edge-images
- Mock documentation: https://rpm-software-management.github.io/mock/
- Mock RHEL chroot documentation: https://rpm-software-management.github.io/mock/Feature-rhelchroots.html
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins archiveArtifacts step documentation: https://www.jenkins.io/doc/pipeline/steps/core/
- Fedora EPEL mock package listing: https://packages.fedoraproject.org/pkgs/mock/mock/epel-9.html

## Issues Found
- The prerequisite command installed `createrepo`, but RHEL 9 documentation uses `createrepo_c` for repository metadata generation. Updated the package and commands to `createrepo_c`.
- The prerequisite command installed `mock` without noting that it may come from EPEL on RHEL 9. Added the EPEL release package installation before installing `mock`.
- The spec file installed the sample binary under `/usr/local/bin`, which is inappropriate for RPM-managed packaged files. Updated the install command to pass `prefix=%{_prefix}` and changed the file list to `%{_bindir}/myapp`.
- The spec changelog date used `Tue Mar 04 2026`, but March 4, 2026 is a Wednesday. Corrected it to `Wed Mar 04 2026`.
- The Jenkinsfile used the `rocky-9-x86_64` mock config while the post is specifically about RHEL builds. Updated mock commands to use `rhel-9-x86_64`, matching mock's RHEL chroot documentation.
- The test stage said it verified installation but only queried metadata and file lists. Added `mock -r rhel-9-x86_64 --install "$RPM"` so the stage actually verifies installation in the clean chroot.

## Review Notes
- The example disables repository GPG checking for simplicity. That is acceptable for a sample, but production repositories should sign packages and metadata and enable GPG verification.
- The Jenkins `branch 'main'` condition is most reliable in a Multibranch Pipeline or when branch metadata is available from the SCM job.
