# Validation Summary: Repair Photon OS Updates After Repository URL Changes or TLS Failures

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- Photon OS 4 and 5 and the photon-repos package.
- tdnf, RPM repositories, metadata caching, and GPG signature verification.
- DNS/name resolution, systemd time diagnostics, HTTPS/TLS, certificate authorities, and inspecting proxies.
- curl and Linux shell utilities.

## Sources Consulted
- [Photon repository migration notice](https://github.com/vmware/photon/wiki/changes-to-repository-location-in-photon) — initial hostname migration and the exact grep/sed/photon-repos update command; also read its raw wiki source.
- [Photon 4 repository definition](https://github.com/vmware/photon/blob/4.0/SPECS/photon-repos/photon.repo) and [Photon 5 repository definition](https://github.com/vmware/photon/blob/5.0/SPECS/photon-repos/photon.repo) — current hostname, release/architecture variables, and signature settings.
- [Photon 4 migration script](https://github.com/vmware/photon/blob/4.0/SPECS/photon-repos/migrate-repo-url.inc) and [Photon 5 migration script](https://github.com/vmware/photon/blob/5.0/SPECS/photon-repos/migrate-repo-url.inc) — migration of both older hostnames to packages.broadcom.com.
- [Photon 4 photon-repos specification](https://github.com/vmware/photon/blob/4.0/SPECS/photon-repos/photon-repos.spec) and [Photon 5 specification](https://github.com/vmware/photon/blob/5.0/SPECS/photon-repos/photon-repos.spec) — preserved configuration files, upgrade scriptlets, and migration changelog.
- [Upstream tdnf commands](https://github.com/vmware/tdnf/wiki/Commands) — clean subcommand version restrictions, verified through the raw wiki source.
- [Photon 4 tdnf specification](https://github.com/vmware/photon/blob/4.0/SPECS/tdnf/tdnf.spec) — tdnf 3.3.12 baseline.
- [Photon tdnf commands](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/standard-syntax-for-tndf/commands/) and [command options](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/standard-syntax-for-tndf/options-for-commands/) — repolist, clean, makecache, check-update, update, --refresh, and --version.
- [Photon configuration files and repositories](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/configuration-files-and-repositories/) — configuration paths, repository sections, and gpgcheck.
- [Photon SSL options](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/ssl-options/) — repository-scoped sslverify and sslcacert.
- [Photon signed packages](https://vmware.github.io/photon/docs-v5/administration-guide/photon-os-packages/signed-packages/) — package signature verification and signing-key inspection.
- [Broadcom repository migration guidance](https://knowledge.broadcom.com/external/article/322788/photon-os-migration-to-new-package-repos.html) — distinction between standalone Photon consumers and vendor-managed appliances. Its historical Bintray replacement instructions were not used as current hostname guidance.
- [curl TLS certificate verification](https://curl.se/docs/sslcerts.html) — hostname/CA verification, --cacert, verbose diagnostics, and the consequences of -k.
- [OpenSSL certificate verification options](https://docs.openssl.org/3.0/man1/openssl-verification-options/) — certificate chain and validity-time checks.
- [systemd timedatectl source manual](https://github.com/systemd/systemd/blob/main/man/timedatectl.xml) and [os-release source manual](https://github.com/systemd/systemd/blob/main/man/os-release.xml) — clock status and OS identification.
- [getent manual](https://www.man7.org/linux/man-pages/man1/getent.1.html) — hosts database lookup through the configured name-service sources.

## Issues Found
1. **Outdated repository endpoint.** The post treated packages-prod.broadcom.com as the current destination. The official Photon 4 and 5 repository definitions and migration scripts now target packages.broadcom.com; their package changelogs record the later migration in December 2025. Preserved the historical notice, added current release-specific references, corrected the manual hostname repair and DNS command, and changed the follow-up search to cover both older hostnames.
2. **Cache command incompatible with older tdnf.** The unconditional `tdnf clean metadata` example requires tdnf 3.4.0 or later, but Photon 4's package specification lists 3.3.12. Replaced it with `tdnf clean all`, which is supported by older versions, and explicitly noted that cached packages are also removed. Kept makecache and check-update unchanged.

## Review Notes
- Reviewed every command block and the INI settings against the relevant command/configuration documentation. The shell examples are syntactically valid; the SSL lines are settings for an existing repository section, and the example CA path must be provisioned locally.
- The migration update command is directly supported by the official notice. Current migration scriptlets use grep and sed and preserve the repository path while replacing the hostname. Custom sources and release-specific variables should remain intact.
- The TLS, clock, proxy, and RPM-signature distinctions are sound. Trusting a CA does not replace package signature verification. The installed-version caveats for configuration scope and check-update exit behavior are appropriate; no universal numeric exit code is asserted.
- getent checks the configured hosts database, which can include /etc/hosts as well as DNS. It is useful for the application's effective hostname resolution but is not a DNS-server-only test.
- Current Photon 5 repository packaging includes subrelease/snapshot configuration. The post correctly directs readers to release-matching vendor files rather than prescribing a universal repository path or enabled-repository set.
- This was a documentation and source review, not a live Photon VM test. No package transactions were run, and successful metadata download from a particular deployment was not established. GNU manual fetches for the standard date/grep utilities timed out; their basic syntax was reviewed without claiming a successful retrieval of those pages.
- README changes were limited to the two technical corrections above; the post's structure and tone were retained.
