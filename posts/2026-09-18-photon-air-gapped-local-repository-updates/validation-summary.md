# Validation Summary: How to Upgrade Photon OS in an Air-Gapped Environment with a Local Repository

## Status

validated

## Post Type

Technical guide with shell commands and repository configuration examples.

## Technologies Covered

- Photon OS 5 package updates and the Photon OS 4-to-5 upgrade boundary
- tdnf, DNF reposync, and RPM package management
- Yum-compatible repositories, repodata, and security-advisory metadata
- GPG package signatures, checksum manifests, and HTTPS trust
- Air-gapped transfer, immutable snapshots, canary testing, and backup recovery

## Sources Consulted

- [Photon OS repository overview](https://vmware.github.io/photon/docs-v5/administration-guide/photon-os-packages/photon-os-package-repositories/) — release, updates, and other repository roles.
- [Photon: Adding a New Repository](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/adding-a-new-repository/) — configuration location, file URLs, repository IDs, enablement, signing keys, and TLS settings.
- [DNF reposync plugin documentation](https://dnf-plugins-core.readthedocs.io/en/latest/reposync.html) — flags, directory layout, metadata transfer, and the newest-only caveat.
- [Photon tdnf command options](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/standard-syntax-for-tndf/options-for-commands/) — repository enable/disable flags and glob support.
- [Photon tdnf commands](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/standard-syntax-for-tndf/commands/) and [upstream tdnf command reference](https://github.com/vmware/tdnf/wiki/Commands) — repolist, makecache, update/upgrade, advisory queries, and transaction behavior.
- [Photon: Examining Signed Packages](https://vmware.github.io/photon/docs-v5/administration-guide/photon-os-packages/signed-packages/) — package signature verification and trusted RPM keys.
- [Photon root account guidance](https://vmware.github.io/photon/docs-v5/administration-guide/photon-os-packages/root-account-and-sudo-commands/) — administrative command execution.
- [Upgrading Photon OS 4.0 to 5.0](https://vmware.github.io/photon/docs-v5/installation-guide/upgrading-to-photon-os-5/) — photon-upgrade, backups, reboot, and preproduction testing.
- [createrepo_c project documentation](https://rpm-software-management.github.io/createrepo_c/) — repository metadata generation and separate additional metadata management.
- [RPM manual](https://rpm.org/docs/6.0.x/man/rpm.8) — package querying and RPM transaction semantics.
- [GNU uname documentation](https://www.gnu.org/software/coreutils/manual/html_node/uname-invocation.html) and [systemd os-release specification](https://github.com/systemd/systemd/blob/main/man/os-release.xml) — architecture and release identification.

## Issues Found

- **Missing repository configuration destination:** The example supplied valid INI content but did not explicitly instruct readers to install it where tdnf reads repository definitions. Added instructions to save it as `/etc/yum.repos.d/offline-photon.repo` as root, following Photon's documented repository setup.
- **Unstated privileges for target updates:** The target commands omitted their required administrative execution context. Specified that the commands run as root, consistent with the Photon administration guide and avoiding an assumption that sudo is installed.

## Review Notes

- Verified the shell syntax and configuration fields. The DNF repository IDs match the resulting subdirectories and the target file URLs. Disabled-by-default offline repositories are explicitly enabled for both cache creation and updates; the quoted wildcard excludes other configured sources.
- Preserving repository metadata, avoiding an incomplete newest-only mirror, and verifying RPM signatures separately are technically sound. The reposync commands do not themselves request GPG checking; the prose explicitly requires a separate verification step before transfer.
- Security-advisory metadata must exist upstream to be preserved. Package availability alone does not establish advisory coverage. Package GPG checking also does not authenticate all repository metadata; the checksum manifest needs a trusted provenance in the approved transfer process.
- The commands target the documented DNF reposync plugin. A staging system with a different DNF implementation must provide the compatible plugin and options. Repository URLs, architecture, release, and trusted keys are deliberately site-specific prerequisites.
- The Photon 4-to-5 workflow is correctly outside this within-release update guide. Keeping an older repository snapshot does not itself revert installed packages or application data.
- All three technical documentation links in the post resolved to the intended resources. No deprecated option was identified in the examples.
- Validation was based on official documentation and static checks. No actual Photon package transaction, complete repository mirror, isolated-network installation, or backup restore was executed; the guide's clone and acceptance tests remain necessary for each deployment.
