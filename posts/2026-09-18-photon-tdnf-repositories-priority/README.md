# How to Add, Prioritize, and Troubleshoot tdnf Repositories on Photon OS 5

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Package Management, Linux

Description: Add and prioritize Photon OS tdnf repositories while preserving package signatures, release alignment, and diagnostic visibility.

---

A repository configuration controls both where packages come from and which competing package candidate wins. On Photon OS, copying a repository file from another RPM distribution can introduce incompatible packages even when `tdnf` successfully parses it. Start with the installed release and add only repositories intended for that Photon release and architecture.

## Inventory the current sources

Run these read-only checks first:

```bash
cat /etc/os-release
uname -m
tdnf --version
tdnf repolist
ls -l /etc/yum.repos.d
```

Photon stores repository definitions as `.repo` files under `/etc/yum.repos.d`; global configuration lives under `/etc/tdnf`. The [repository guide](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/adding-a-new-repository/) explains the format. Save a copy of the existing files before changing them.

Identify the repository IDs inside square brackets. Commands such as `--enablerepo` refer to those IDs, not the filenames or human-readable names. Duplicate IDs in separate files make troubleshooting unnecessarily ambiguous, so give a new source a unique ID.

Check for stale upstream endpoints too. The official [repository migration notice](https://github.com/vmware/photon/wiki/changes-to-repository-location-in-photon) supersedes examples that still use `packages.vmware.com`. Prefer the current `photon-repos` package for vendor-maintained definitions.

## Add an internal repository explicitly

Suppose your organization publishes signed packages built for Photon OS 5. Create `/etc/yum.repos.d/company-tools.repo` with your real URL and verified signing-key path:

```ini
[company-tools]
name=Company tools for Photon OS 5
baseurl=https://packages.example.com/photon/5.0/x86_64
enabled=0
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/COMPANY-RPM-GPG-KEY
sslverify=1
priority=60
```

The URL and key are placeholders. Install the signing key through your trusted configuration process and verify its fingerprint out of band. A repository reached over HTTPS still needs package-signature verification; TLS and RPM signatures protect different parts of the delivery path.

Start disabled, then test it for a single operation:

```bash
tdnf --disablerepo='*' --enablerepo=company-tools makecache
tdnf --enablerepo=company-tools info company-agent
```

The first command isolates metadata access. The second leaves normal repositories available so dependency information can still resolve. Replace `company-agent` with a real package from your source.

## Understand priority before enabling it

The current [tdnf repository configuration reference](https://github.com/vmware/tdnf/wiki/Repository-Configuration) specifies that lower numerical priority is preferred and documents a default of 50. A package from a preferred repository can take precedence even when another repository offers the same name.

In this example, `60` leaves the internal repository less preferred than a source using the default. That reduces accidental replacement of distribution packages, but it is not a package-isolation boundary. Unique internal package names and careful dependency design remain valuable.

Verify the behavior against the installed `tdnf` version and inspect the proposed transaction before accepting an installation. If you intend an internal package to replace a Photon package, treat that as a deliberate compatibility change rather than simply lowering a number until installation succeeds.

Do not confuse repository priority with metalink mirror preference. Repository priority selects among package sources; mirror preference selects an endpoint for fetching equivalent repository metadata.

## Diagnose failures by layer

A metadata failure needs a different repair from an unsatisfied dependency:

| Symptom | First check |
| --- | --- |
| Cannot resolve hostname | Guest DNS and resolver configuration |
| TLS verification failure | Clock, CA chain, proxy, and hostname |
| HTTP 404 for metadata | Base URL and release/architecture path |
| Package missing | Enabled repository ID and package spelling |
| Dependency conflict | Release alignment and competing package candidates |
| Signature failure | Package provenance and trusted key fingerprint |

Use `tdnf clean metadata` followed by `tdnf makecache` after correcting a URL or stale metadata issue. Clearing cache cannot fix an invalid server certificate or supply an RPM that the server never published. Keep the original error message and failing URL in the incident record.

For a repository that is required to supply an approved dependency, avoid silently skipping unavailable metadata. A successful transaction against only the surviving sources may conceal an incomplete patch set.

## Promote the configuration

After a disposable Photon VM can resolve and install the intended package, set `enabled=1` if routine access is required. Record the repository owner, signing key, priority choice, and supported release. Test a subsequent package update as well as the initial installation.

Remove the test VM or restore its baseline after evaluation. Removing a `.repo` file disables a source but does not remove packages previously installed from it, so rollback planning must account for both configuration and installed software.
