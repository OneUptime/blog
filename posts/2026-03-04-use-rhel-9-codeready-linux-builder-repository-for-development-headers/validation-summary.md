# Validation Summary: How to Use RHEL CodeReady Linux Builder Repository for Development Headers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CodeReady Linux Builder repository
- DNF package management
- Red Hat Subscription Manager
- RPM packages and development headers

## Sources Consulted
- Red Hat Enterprise Linux 9: Managing software with the DNF tool, Distribution of content in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_distribution-of-content-in-rhel-9_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9: Managing software with the DNF tool, Installing RHEL 9 content: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 Package manifest, repositories and CodeReady Linux Builder package listings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- Red Hat Enterprise Linux 9: Considerations in adopting RHEL 9, repository ID examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/ref_repositories_considerations-in-adopting-rhel-9
- DNF Command Reference, repository-packages command and --enablerepo behavior: https://dnf.readthedocs.io/en/stable/command_ref.html

## Issues Found
- The post used `python3-devel` as the example package for installing development headers from CodeReady Linux Builder. Red Hat's RHEL 9 package data lists `python3-devel` in AppStream, while CodeReady Linux Builder contains many other `-devel` packages, including `libbpf-devel`. I changed the example package and verification command from `python3-devel` to `libbpf-devel` so the example matches the repository being discussed.
- The overview said CodeReady Linux Builder packages are not supported by Red Hat "for runtime deployments." Red Hat documentation states that packages included in CodeReady Linux Builder are unsupported. I tightened the wording to avoid implying they are supported in non-runtime scenarios.

## Review Notes
The repository ID pattern `codeready-builder-for-rhel-9-$(uname -m)-rpms`, `subscription-manager repos --enable/--disable`, `dnf install`, `dnf group install`, `dnf repolist`, `dnf repository-packages`, and `rpm -qi` usage are technically valid for the RHEL 9 context. Local validation with installed CLI help was not possible because this review environment does not have `dnf`, `rpm`, or `subscription-manager` installed.
