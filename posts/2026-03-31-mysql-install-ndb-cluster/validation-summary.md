# Validation Summary: How to Install MySQL NDB Cluster

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- MySQL NDB Cluster 8.0
- ndb_mgmd (management node daemon)
- ndbd / ndbmtd (data node daemons)
- mysqld with NDB Cluster storage engine
- DEB and RPM package management on Linux

## Sources Consulted
- MySQL NDB Cluster Installation from RPM: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-install-linux-rpm.html
- MySQL NDB Cluster Installation from DEB: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-install-debian.html
- MySQL NDB Cluster Downloads page: https://dev.mysql.com/downloads/cluster/
- MySQL NDB Cluster Initial Configuration: https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-install-configuration.html

## Issues Found

### 1. Missing required dependency packages for SQL node installation
**What was wrong:** The DEB and RPM installation steps for the SQL node omitted the `mysql-cluster-community-common` and `mysql-cluster-community-libs` packages. These are required dependencies for the server and client packages, and the install commands would fail with unresolved dependency errors without them.

**What was changed:** Added `mysql-cluster-community-common` and `mysql-cluster-community-libs` to both the DEB and RPM SQL node installation steps, installed before the client and server packages. Also added these packages to the "Choosing the Right Package" reference list with descriptions.

**Why:** The official MySQL documentation lists these as required packages for SQL node installations. Without them, `dpkg -i` and `rpm -ivh` would report missing dependencies.

### 2. Misleading "at least three hosts" claim in topology section
**What was wrong:** The text stated "A minimal NDB Cluster requires at least three hosts" but the immediately following table listed four distinct hosts (mgm-node, data-node-1, data-node-2, sql-node-1). This was confusing — the table contradicted the host count stated in the text.

**What was changed:** Changed the text to "A minimal NDB Cluster involves four node processes" which accurately matches the four-entry table. The existing paragraph about co-locating the management node and SQL node on the same host already explains how to reduce the physical host count.

**Why:** The original phrasing was technically defensible (3 hosts with co-location) but misleading when immediately followed by a 4-host table. The fix aligns the description with what the table shows.

## Review Notes
- The DEB package filenames use `x86_64` in the architecture field, while Debian convention typically uses `amd64`. The actual filenames in the downloaded bundle may differ slightly. Since the post frames these as examples ("example for 8.0"), this is acceptable.
- The download URLs are plausible but not guaranteed to be permanently valid — MySQL may change specific version availability over time. The post correctly frames these as version-specific examples.
- The data node data directory `/usr/local/mysql/data` is more typical of binary tarball installations. Package installs usually default to `/var/lib/mysql`. For NDB data nodes this is configurable via `DataDir` in `config.ini`, so the chosen path is valid but readers should know it's not the package default.
- The post covers binary installation only. Readers may also benefit from knowing about the APT repository method (`apt-get install mysql-cluster-community-*`) as an alternative, but this is outside the current scope.
