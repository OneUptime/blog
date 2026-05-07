# Validation Summary: How to Install Rancher on Rocky Linux

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Rancher
- Rocky Linux 9
- Docker Engine
- SELinux
- firewalld
- K3s
- Linux networking and sysctl configuration

## Sources Consulted
- Rancher single-node Docker install: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher installation requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher SELinux RPM guidance: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/rancher-security/selinux-rpm/about-rancher-selinux
- Rancher bootstrap password guidance: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/bootstrap-password
- Rancher support matrix: https://www.suse.com/suse-rancher/support-matrix/all-supported-versions/rancher-v2-14-1/
- Docker Engine on CentOS / RHEL-family systems: https://docs.docker.com/engine/install/centos/
- Rocky Linux Docker installation guidance: https://docs.rockylinux.org/gemstones/containers/docker/
- K3s requirements, including firewalld guidance: https://docs.k3s.io/installation/requirements

## Issues Found
- The post presented the single-node Docker install as a general Rancher installation path. I added the official Rancher caveat that this Docker method is for development and testing only, not production.
- The Docker repository URL targeted Docker's CentOS repository. Rocky Linux's own Docker guidance uses Docker's RHEL repository for Rocky 9, so I changed the repo URL accordingly.
- The dependency list used older package guidance (`yum-utils`, `device-mapper-persistent-data`, and `lvm2`) that is not what current Docker docs require for this flow. I replaced it with `dnf-plugins-core` plus the remaining utility packages used in the post.
- The SELinux section disabled enforcement by switching to permissive mode. Current Rancher documentation provides the `rancher-selinux` policy package for SELinux-enabled hosts, so I replaced the permissive-mode instructions with the official SELinux RPM setup.
- The firewalld section opened ports manually, but current Rancher installation requirements state that `firewalld` conflicts with Kubernetes networking plugins. I replaced that section with the documented approach of disabling `firewalld` for this install path.
- The kernel networking section loaded multiple IPVS and overlay modules that are not part of the documented single-node Rancher Docker requirements, and the post omitted the precise sysctl Rancher documents. I reduced this to the required `br_netfilter` handling and `net.bridge.bridge-nf-call-iptables=1`.
- The Docker commands after installation assumed passwordless Docker access immediately. I standardized the walkthrough to use `sudo docker` so the commands work without requiring a logout/login cycle first.
- The backup example assumed `/backup` already existed. I added directory creation before the archive command so the backup step works as written.

## Review Notes
- The post is technically correct after the fixes above.
- Rancher's official Docker install examples still use `rancher/rancher:latest` for development and testing. For repeatable environments, pinning to a specific supported Rancher release and checking the support matrix would be safer.
- The current Rancher support matrix treats Rocky Linux 9.x as validated as part of Rancher's RHEL testing, so readers should still consult the matrix for the Rancher version they intend to run.
