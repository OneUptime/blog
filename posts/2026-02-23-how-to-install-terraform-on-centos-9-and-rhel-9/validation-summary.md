# Validation Summary: How to Install Terraform on CentOS 9 and RHEL

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Terraform CLI
- HashiCorp RPM repository
- CentOS Stream 9
- Red Hat Enterprise Linux 9
- DNF/YUM package management
- firewalld
- SELinux
- AWS credentials file format

## Sources Consulted
- HashiCorp Developer, Terraform install documentation: https://developer.hashicorp.com/terraform/install
- HashiCorp Terraform releases index: https://releases.hashicorp.com/terraform/
- HashiCorp Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Red Hat Enterprise Linux 9 DNF custom repository documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_managing-custom-software-repositories_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- firewalld concepts documentation: https://firewalld.org/documentation/concepts.html

## Issues Found
- The post described the guide as applying to "RHEL" generally while the commands and compatibility claims were specific to RHEL 9. Updated the description and compatibility wording to say RHEL 9.
- The post said the methods work identically because CentOS 9 Stream is binary compatible with RHEL. This was too strong for CentOS Stream, which tracks ahead of RHEL. Reworded it to focus on the shared DNF/YUM tooling and HashiCorp's documented CentOS/RHEL repository path.
- The prerequisite said `curl` or `wget` was acceptable, but all download examples use `curl`. Updated the prerequisite to require `curl`.
- The Terraform version examples used Terraform 1.7.x / 1.7.5 and an update example of 1.8.0. HashiCorp's current install documentation and release index list Terraform 1.15.4 as the latest stable version, so the examples were updated to 1.15.x / 1.15.4.
- The ARM64 note only mentioned changing the download URL, but the unzip and cleanup commands also include the architecture suffix. Updated the note to tell readers to use `arm64` consistently in the download, unzip, and cleanup commands.
- The firewalld section implied that `firewall-cmd --list-all` ensured outbound HTTPS was allowed. `--list-all` reviews zone configuration; outbound filtering is handled through firewalld policies in stricter setups. Reworded the text and command comment to describe it as review/checking rather than enforcement.

## Review Notes
The quick Terraform test using `null_resource` and `local-exec` remains technically valid, though HashiCorp recommends using provisioners sparingly for real infrastructure workflows. The manual installation method could be improved in the future by adding checksum verification, which HashiCorp documents for official release downloads.
