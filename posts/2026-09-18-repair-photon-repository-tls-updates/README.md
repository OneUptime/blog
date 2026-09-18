# How to Repair Photon OS Updates After Repository URLs Move or TLS Certificates Fail

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Package Management, Troubleshooting

Description: Repair Photon OS updates by separating repository hostname migrations from DNS, clock, proxy, and CA trust failures.

---

When `tdnf` stops updating, the error often gets described as a repository problem even if the actual failure is DNS, TLS, or a corporate proxy. Start with the failing URL and exact message. Photon has also moved its package hosting endpoint, so an old VM image can contain repository definitions that no longer represent the current service.

## Capture the state before changing it

Run these commands as an administrator:

```bash
cat /etc/os-release
tdnf --version
tdnf repolist
date -u
grep -R '^baseurl=' /etc/yum.repos.d
```

Back up `/etc/yum.repos.d` and `/etc/tdnf/tdnf.conf`. Record whether the affected system is a standalone Photon installation or a vendor appliance. Appliances such as vCenter have product-specific update mechanisms; their embedded operating system should follow that product's supported maintenance procedure.

Retry metadata refresh once and preserve the output. Distinguish a name-resolution error, a failed TLS handshake, an HTTP error, and a signature-verification failure. They occur at different stages and should not trigger the same workaround.

## Apply the official repository migration

The Photon project's [migration notice](https://github.com/vmware/photon/wiki/changes-to-repository-location-in-photon) explains the move from `packages.vmware.com` to `packages-prod.broadcom.com`. It directs administrators of Photon 4 and 5 systems to update the repository package together with the text-processing dependencies used by its migration logic:

```bash
tdnf update --refresh grep sed photon-repos
```

If the old endpoint still works, this is the preferred starting point. Review the resulting definitions and any `.rpmnew` files when locally modified configuration was preserved.

If the old host is already unreachable, correct only the affected vendor `baseurl` hostname using the current official notice and release-matching repository files as your reference. Preserve `$releasever`, `$basearch`, repository IDs, signature settings, and custom internal sources. Do not replace a Photon 4 path with a Photon 5 path as a shortcut to upgrading.

Verify the edited URL reaches the expected `repodata/repomd.xml`, then update `photon-repos` so future package management uses vendor-maintained configuration. Search again for the retired hostname and explain any remaining occurrences rather than editing unrelated configuration indiscriminately.

## Separate trust failures from endpoint failures

Check DNS and time before importing certificates:

```bash
getent hosts packages-prod.broadcom.com
timedatectl status
```

A certificate that is not yet valid may indicate a clock problem. A hostname mismatch can indicate a wrong URL or interception. An unknown issuer can mean the server omitted a chain certificate, the guest's CA package is old, or an authorized TLS-inspecting proxy is issuing replacement certificates.

If `curl` is available, request the failing metadata URL with verbose output and preserve the certificate error. Use `--cacert` with an independently verified CA bundle for diagnosis; do not add `-k` to the permanent update process. If a proxy is involved, obtain the approved CA from your organization's established distribution channel.

Photon's [SSL options](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/ssl-options/) support repository-specific CA configuration. For an internal source, an explicit setting can make the trust boundary clear:

```ini
sslverify=1
sslcacert=/etc/pki/company/repository-ca-bundle.pem
```

The path must exist and contain the appropriate trusted certificates. Verify the installed `tdnf` version's supported configuration scope before using global options from newer upstream examples.

## Restore a healthy transaction path

Once the endpoint, clock, proxy, and trust chain are correct, refresh metadata:

```bash
tdnf clean metadata
tdnf makecache
tdnf check-update
```

`check-update` may use a distinct exit status when updates are available; automation should interpret the installed command's behavior rather than treating every nonzero status as a transport failure.

Review a package update before approving it. Keep `gpgcheck=1`: trusting a TLS certificate is not a replacement for checking the RPM's publisher. A signature failure after fixing TLS requires verification of the package and signing key, not another network workaround.

## Prevent the next outage

Track the installed `photon-repos` and CA-certificate package versions in your image inventory. Refresh old templates before scaling new VMs from them. Record proxy settings in configuration management so a repair survives reboot and template rebuilds.

Finally test repository refresh from a newly created VM, not only the repaired machine. A one-off fix leaves the underlying image pipeline broken if each new deployment still contains the retired endpoint or missing corporate CA.
