# Offline OSV Scanning: Keeping Dependency Data Private in Restricted Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV-Scanner, Offline Scanning, Air-Gapped Security, Vulnerability Database

Description: Stage OSV ecosystem databases, transfer them into a restricted environment, and run OSV-Scanner without sending dependency data over the network.

---

OSV-Scanner v2 has an official offline mode that matches extracted packages against local OSV ecosystem databases. Full `--offline` mode does not download or update the database and does not send project or dependency information anywhere.

Offline operation has two separate jobs: update the database in a connected staging environment, then scan with network access unavailable in the restricted environment.

## Choose the correct flag

The two similarly named modes have different privacy guarantees:

| Flag | Vulnerability data | Other features |
|---|---|---|
| `--offline` | Local only | No network required; project/dependency data is not sent anywhere |
| `--offline-vulnerabilities` | Local only | Other features, such as supported transitive resolution, may make network requests |

Use `--offline` for an air-gapped or strict no-egress scan:

```bash
osv-scanner --offline /path/to/project
```

Do not substitute `--offline-vulnerabilities` when the requirement is “no dependency data leaves the environment.” It only changes vulnerability matching.

## Set a controlled database directory

Set `OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY` to make database location explicit:

```bash
export OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY=/opt/osv-data
```

OSV-Scanner expects this layout:

```text
/opt/osv-data/
└── osv-scanner/
    ├── npm/all.zip
    ├── PyPI/all.zip
    ├── Go/all.zip
    └── ...
```

Without the environment variable, OSV-Scanner checks the location returned by Go's `os.UserCacheDir`, then `os.TempDir`. An explicit read-only path is easier to audit and prevents a temporary cache from disappearing between runs.

## Stage databases on a connected host

OSV-Scanner can download or update local databases when an offline-database mode and the download option are used:

```bash
export OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY="$PWD/osv-cache"
osv-scanner \
  --offline-vulnerabilities \
  --download-offline-databases \
  /path/to/representative/project
```

The download flag needs network access and is for staging, not the disconnected scan. Select a representative project whose ecosystems match the restricted workloads, and verify the resulting directory contains every required `<ecosystem>/all.zip`.

You can also download archives manually. For example:

```bash
mkdir -p osv-cache/osv-scanner/PyPI
curl -fL \
  https://osv-vulnerabilities.storage.googleapis.com/PyPI/all.zip \
  -o osv-cache/osv-scanner/PyPI/all.zip
```

The official ecosystem list is available at:

```text
https://osv-vulnerabilities.storage.googleapis.com/ecosystems.txt
```

Preserve the zip files in the expected per-ecosystem layout; do not extract their contents into that cache structure.

## Transfer and verify the snapshot

Package the cache using your approved transfer process. Record at least:

- retrieval time;
- source URLs;
- OSV-Scanner version;
- ecosystem list;
- file sizes and cryptographic hashes produced by your staging process;
- transfer approval or media identifier.

After transfer, verify the hashes before promotion. Mount the final directory read-only for scan jobs when possible. Keep the previous known-good snapshot until the new one has passed a canary scan.

## Scan without egress

In the restricted environment:

```bash
export OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY=/opt/osv-data

osv-scanner scan source \
  --offline \
  --recursive \
  --format=json \
  --output-file=osv-offline-results.json \
  /workspace/project
```

Test this with network access actually disabled. A missing local database should produce an error; it must not be translated into a clean scan.

Retain database snapshot identity with the result so two scans performed against different advisory vintages can be explained.

## Plan for offline limitations

The official offline documentation lists commit-level scanning as unsupported. The supported-artifacts documentation also notes that transitive dependency resolution is disabled in offline mode for the documented manifest-resolution workflow.

These limitations affect inventory completeness:

- prefer exact lockfiles and versioned purls over loose manifests;
- generate SBOMs and resolved dependency artifacts before entering the restricted boundary;
- do not expect vendored Git commit matching to behave like an online scan;
- treat unsupported ecosystems or absent archives as coverage gaps.

`--offline-vulnerabilities` may restore other network-backed capabilities, but then the run is not fully offline. Decide based on data-flow policy, not convenience.

## Operate a freshness schedule

Offline scanning becomes stale unless the transfer process repeats. Define a maximum database age, alert before it is exceeded, and run a canary containing a known package identity after every update.

Track these states separately:

- clean against a fresh approved snapshot;
- findings present;
- scanner or inventory error;
- database older than policy;
- ecosystem database missing;
- feature unsupported offline.

A local database protects dependency privacy, but only explicit provenance, completeness checks, and routine refreshes make the result useful for vulnerability management.

## Official Documentation

- [OSV-Scanner offline mode](https://google.github.io/osv-scanner/usage/offline-mode/)
- [OSV-Scanner usage](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner supported artifacts and manifest-resolution limits](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/)
- [OSV.dev downloadable data](https://google.github.io/osv.dev/data/)
- [Public OSV vulnerability bucket](https://osv-vulnerabilities.storage.googleapis.com/)

