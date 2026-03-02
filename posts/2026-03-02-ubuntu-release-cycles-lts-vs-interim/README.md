# How to Understand Ubuntu Release Cycles: LTS vs Interim Releases

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Release Management, LTS, Planning

Description: A clear explanation of Ubuntu's release cycle, the difference between LTS and interim releases, support timelines, and how to choose the right release for your server workload.

---

Ubuntu releases on a predictable schedule, and understanding the cadence matters for planning upgrades and budgeting support costs. Choosing the wrong release type can mean unexpected maintenance overhead or running unsupported software.

## The Ubuntu Release Schedule

Canonical releases a new Ubuntu version every six months:
- **April releases**: X.04 (e.g., 24.04 released in April 2024)
- **October releases**: X.10 (e.g., 24.10 released in October 2024)

Every two years in April, the release is designated as Long Term Support (LTS):
- 20.04 LTS (Focal Fossa) - April 2020
- 22.04 LTS (Jammy Jellyfish) - April 2022
- 24.04 LTS (Noble Numbat) - April 2024
- 26.04 LTS - April 2026 (forthcoming)

The releases between LTS versions are called interim or non-LTS releases:
- 22.10, 23.04, 23.10 (between 22.04 and 24.04)
- 24.10, 25.04, 25.10 (between 24.04 and 26.04)

## Support Timelines: LTS vs Interim

### LTS Releases

LTS releases receive:
- **5 years of standard security maintenance** for Main/Restricted packages
- **10 years total with Ubuntu Pro ESM** (extended to Universe packages too)

For 24.04 LTS:
- Standard support: Until April 2029
- ESM with Ubuntu Pro: Until April 2034

### Interim Releases

Interim releases receive only:
- **9 months of security maintenance**

After 9 months, the release reaches End of Life (EOL) and receives no further updates. For a server you care about, running an EOL release is a security liability.

For example:
- Ubuntu 23.10 was released October 2023
- EOL: July 2024
- Any server still running 23.10 after July 2024 is unpatched

## Which Release Type for Servers?

For virtually all server workloads, the answer is LTS. The reasons are practical:

**Stability**: LTS releases go through extensive testing and have point releases (24.04.1, 24.04.2, etc.) that accumulate bug fixes. Interim releases get less testing and are not intended for production use.

**Support window**: A 5-year support window lets you plan upgrades on your schedule. A 9-month window creates constant upgrade pressure.

**Compatibility**: ISVs, cloud providers, and infrastructure tools (Kubernetes, Docker, Ansible, etc.) test against LTS releases. Interim releases are often not officially supported by third-party software vendors.

**Upgrade paths**: Ubuntu only supports upgrading between adjacent releases. From an interim release, you must upgrade through each release to reach the next LTS. From an LTS, you can jump directly to the next LTS.

```
LTS path: 22.04 -> 24.04 -> 26.04 (direct jumps)
Interim path: 23.10 -> 24.04 (forced to upgrade every 9 months)
```

## Why Run Interim Releases At All?

Interim releases exist for users who want newer software. They include:
- Later versions of programming language runtimes
- Newer kernel versions
- Updated desktop environments and applications

For server workloads, these benefits rarely outweigh the stability trade-off. Common scenarios where interim makes sense:
- Developer machines tracking the latest tooling
- Testing compatibility with upcoming LTS features
- Organizations with dedicated Linux engineers who can handle frequent upgrades
- Workloads that specifically require newer kernel features not yet backported to LTS

## Point Releases and When to Deploy New Machines

LTS point releases (22.04.1, 22.04.2, etc.) are installation media updates that bundle accumulated updates. They do not change the version - a machine installed from 22.04 that has applied all updates is identical to one installed from 22.04.3.

For new server deployments:
- Use the latest point release ISO to minimize initial update downloads
- The point release is available on the Ubuntu downloads page

```bash
# Check your exact point release version
lsb_release -a
# Shows: Ubuntu 24.04.1 LTS
```

## LTS Upgrade Policy

Ubuntu's official upgrade path from LTS to LTS is supported and tested:

```bash
# On an LTS system, do-release-upgrade defaults to the next LTS
cat /etc/update-manager/release-upgrades
# Prompt=lts
```

This means running `sudo do-release-upgrade` on 22.04 will offer 24.04 once 24.04.1 is available (typically August after the April release), not 23.10 or 24.10.

To get interim releases:

```bash
# Change to track all releases
sudo nano /etc/update-manager/release-upgrades
# Change: Prompt=normal
```

This is not recommended for servers.

## Hardware Enablement (HWE) Stacks

LTS releases also have Hardware Enablement (HWE) stacks that bring newer kernels and X graphics stacks to older LTS releases. This is how you get newer kernel support on an LTS without switching releases:

```bash
# Check if you are on the GA or HWE kernel
uname -r
# 6.8.0-35-generic (Noble GA kernel)
# 6.11.0-9-generic (Noble HWE kernel from 24.10)

# Install the HWE kernel on 24.04
sudo apt install linux-generic-hwe-24.04
```

HWE kernels for LTS releases get the same security support as the LTS itself, making them a clean way to get newer hardware support without leaving the LTS security umbrella.

## Checking EOL Dates

```bash
# Check support status for your current release
ubuntu-support-status

# Or check via the internet
hwe-support-status --verbose

# Install the tool if not present
sudo apt install ubuntu-advantage-tools
```

## Version Numbering Explained

Ubuntu version numbers encode the release date:

- **24.04**: Year 2024, Month 4 (April)
- **24.10**: Year 2024, Month 10 (October)

The codename convention uses an animal with a matching adjective:
- 22.04 Jammy Jellyfish
- 22.10 Kinetic Kudu
- 23.04 Lunar Lobster
- 23.10 Mantic Minotaur
- 24.04 Noble Numbat
- 24.10 Oracular Oriole
- 25.04 Plucky Puffin

In configuration files, package repositories, and upgrade tools, you will see both the version number and the codename used:

```
deb http://archive.ubuntu.com/ubuntu noble main restricted
```

## Planning an Upgrade Window

For a server fleet on 22.04 LTS, the migration window to 24.04 LTS is:

- 24.04 released: April 2024
- 24.04.1 released (upgrade path opens): August 2024
- 22.04 standard EOL: April 2027
- 22.04 ESM EOL: April 2032

This gives you roughly 2.5 years of standard support remaining from today (March 2026) to migrate off 22.04 without needing ESM.

For planning:
1. Start testing 24.04 compatibility for your workloads 6-12 months before your planned migration
2. Migrate non-production environments first
3. Roll out production upgrades within your normal change window process
4. Keep at least one 22.04 machine around for a few months post-migration as a reference

## The 5-Year vs 10-Year Trade-off

With Ubuntu Pro, 10-year support can sound appealing for deferring migrations. The reality is:

Running 22.04 into the 2030s means running increasingly old software. By 2029 (standard EOL), the packages in 22.04 will be 7+ years behind current upstream. While they receive security patches, they do not receive new features, performance improvements, or fixes for non-security bugs.

ESM is a safety net for situations where migration is genuinely difficult (regulatory freezes, end-of-life hardware, complex application stacks), not a reason to indefinitely defer normal upgrade cycles.

The right mental model: plan to upgrade LTS-to-LTS within the standard 5-year support window. Use ESM as a bridge when you genuinely cannot upgrade in time.
