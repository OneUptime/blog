# Validation Summary: How to Fix Google Cloud SDK `apt update` GPG Signature Errors After a Repository Key Rotation

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud CLI APT repository
- APT and `apt-get`
- Debian and Ubuntu repository configuration
- OpenPGP/GnuPG keyrings
- `signed-by` repository trust scoping
- curl, container images, and CI builds

## Sources Consulted
- [Install the Google Cloud CLI on Debian and Ubuntu](https://docs.cloud.google.com/sdk/docs/install-sdk#deb)
- [Google Cloud CLI versioned archives](https://docs.cloud.google.com/sdk/docs/downloads-versioned-archives)
- [Google Cloud CLI release notes](https://docs.cloud.google.com/sdk/docs/release-notes)
- [Google's published APT key endpoint](https://packages.cloud.google.com/apt/doc/apt-key.gpg)
- [Google Cloud CLI repository `InRelease` metadata](https://packages.cloud.google.com/apt/dists/cloud-sdk/InRelease)
- [Debian `sources.list(5)` manual](https://manpages.debian.org/testing/apt/sources.list.5.en.html)
- [Debian `apt-secure(8)` manual](https://manpages.debian.org/testing/apt/apt-secure.8.en.html)
- [Debian `apt-key(8)` manual](https://manpages.debian.org/bookworm/apt/apt-key.8.en.html)
- [Debian `apt.conf(5)` manual](https://manpages.debian.org/trixie/apt/apt.conf.5.en.html)
- [Debian `apt-get(8)` manual](https://manpages.debian.org/bookworm/apt/apt-get.8.en.html)
- [Debian `apt-cache(8)` manual](https://manpages.debian.org/trixie/apt/apt-cache.8.en.html)
- [GnuPG operational commands](https://gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html)
- [curl command-line manual](https://curl.se/docs/manpage.html#-I)
- [GNU Coreutils `date` options](https://www.gnu.org/software/coreutils/manual/html_node/Options-for-date.html)

## Issues Found
- The two repository-discovery commands only searched legacy `.list` files, required the repository URI and `cloud-sdk` suite to be on the same line, and hid filenames with `grep -h`. They could therefore miss a conflicting deb822 `.sources` stanza and could not identify the file that needed attention. Both commands now scan the standard APT source filenames under `/etc/apt`, print filenames, ignore commented lines, and find the separate `URIs:` and `Suites:` lines used by deb822. The surrounding text now explains how to inspect disabled and multiline stanzas.
- The post said a healthy repository guarantees that `apt-cache policy google-cloud-cli` selects a candidate from Google. Local APT pinning or a newer installed version can override candidate selection. The text now says that the version table should list `packages.cloud.google.com` on a supported architecture and that Google's version is normally, but not unconditionally, the candidate.
- The `curl -I` diagnostic was presented next to discussion of altered repository content even though `-I` retrieves headers only, and it appeared before the dependency-install command. The text now describes it as an optional TLS/HTTP header check when `curl` is already installed and states that APT performs the signed-content verification.

## Review Notes
- Google's current installation page still documents the exact key endpoint, `/usr/share/keyrings/cloud.google.gpg` path, `gpg --dearmor` flow, repository line, `google-cloud-cli` package name, duplicate-source warning, and single-step container build described in the post.
- The live key endpoint returned a valid OpenPGP public key, and that key verified the live `cloud-sdk` `InRelease` signature during this review. All three documentation links in the post resolved successfully.
- APT now describes the one-line `.list` source format as deprecated and says it may eventually be removed, but not before 2029. Google still uses that format in its current official instructions, so retaining the vendor-documented entry is appropriate for this post.
- Google's page still includes `apt-key` fallbacks for old distributions, while current Debian documentation deprecates `apt-key`. The post accurately prefers a scoped keyring for supported modern releases.
