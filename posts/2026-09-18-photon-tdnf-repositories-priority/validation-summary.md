# Validation Summary: How to Add, Prioritize, and Troubleshoot tdnf Repositories on Photon OS 5

## Status

validated

## Post Type

Technical guide with shell commands and repository configuration.

## Technologies Covered

- Photon OS 5 and Linux system inventory
- tdnf repository configuration, package queries, priorities, and metadata caching
- RPM package signatures and signing keys
- HTTPS/TLS, repository availability, and mirror selection

## Sources Consulted

- [Photon OS 5: Adding a New Repository](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/adding-a-new-repository/) — repository file location, IDs, configuration syntax, signatures, and metalink preferences.
- [tdnf Repository Configuration](https://github.com/vmware/tdnf/wiki/Repository-Configuration) — supported fields, priority direction and default, TLS verification, and unavailable repository behavior.
- [tdnf Commands](https://github.com/vmware/tdnf/wiki/Commands) — info, install, clean metadata, and makecache semantics and version requirements.
- [tdnf Common command line options](https://github.com/vmware/tdnf/wiki/Common-command-line-options) — version reporting and repository selection flags, including combined disable/enable patterns.
- [Photon repository migration notice](https://github.com/vmware/photon/wiki/changes-to-repository-location-in-photon) — retirement of the packages.vmware.com alias and migration through photon-repos. Read through the official raw wiki endpoint after the HTML page timed out.
- [Photon OS 5 tdnf package specification](https://github.com/vmware/photon/blob/5.0/SPECS/tdnf/tdnf.spec) — the inspected branch specifies tdnf 3.6.5.
- [Photon OS 5 photon-repos package specification](https://github.com/vmware/photon/blob/5.0/SPECS/photon-repos/photon-repos.spec) — vendor-maintained repository files, signing keys, and migration scriptlets.

## Issues Found

1. **Package information was described as a dependency-resolution check.** The explanation of `tdnf info company-agent` implied that leaving other repositories enabled allowed dependency information to resolve. This command displays package details and does not establish whether an installation transaction can satisfy dependencies. Corrected the explanation while preserving the command and the later installation-testing instructions.
2. **The cache repair instructions omitted the disabled example repository.** Plain `tdnf makecache` does not enable `company-tools`, which the example deliberately leaves disabled. Added the matching `--enablerepo=company-tools` invocation so the repository being troubleshot is refreshed as well.

## Review Notes

- The example configuration uses supported fields and valid INI-style syntax. Lower numerical priority is preferred; the documented default is 50, so 60 makes the example source less preferred than a default-priority source.
- Repository IDs, quoted wildcard disabling, per-command enabling, and the distinction between repository priority and metalink endpoint preference are correct.
- `clean metadata` requires tdnf 3.4.0 or later. The inspected Photon 5 package specification satisfies that requirement; older installations should check their installed version. In supported versions, cleaning includes configured disabled repositories, while refreshing still requires enabling the intended source.
- The migration guidance correctly favors the current photon-repos package. Its specification contains later URL migration changes as well, so the older documentation's example URLs should not be copied as current vendor definitions.
- The HTTPS and RPM signature distinction, diagnostic table, release/architecture compatibility guidance, and warning that removing repository configuration does not uninstall packages are technically sound.
- The URL, package name, and key file are explicitly placeholders. The shown x86_64 repository path must match the target architecture. Repository file changes and system package operations require appropriate administrative privileges.
- This was a documentation and source review, not execution on a Photon OS VM. No internal repository, signing key, or company-agent package was supplied, so live metadata retrieval, signature checks, installation, and updates could not be tested.
