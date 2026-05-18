# Validation Summary: How to Set Up MongoDB Compass on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- MongoDB Compass (GUI client, Electron-based)
- MongoDB (server, connection strings, RBAC roles)
- Ubuntu (apt, dpkg package management)
- MongoDB Query Language (filter, project, sort)
- MongoDB Aggregation Pipeline ($match, $group, $sum, $avg, $sort)
- MongoDB Index types (single field, compound, unique, sparse, TTL)
- MongoDB Explain plans (IXSCAN, COLLSCAN)

## Sources Consulted
- MongoDB Compass documentation: https://www.mongodb.com/docs/compass/current/
- MongoDB Compass install docs: https://www.mongodb.com/docs/compass/current/install/
- MongoDB Compass download page: https://www.mongodb.com/try/download/compass
- MongoDB Manual — Connection String URI Format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Manual — db.grantRolesToUser(): https://www.mongodb.com/docs/manual/reference/method/db.grantRolesToUser/
- MongoDB Manual — Aggregation Pipeline Stages: https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/
- MongoDB Manual — Explain Results (IXSCAN/COLLSCAN): https://www.mongodb.com/docs/manual/reference/explain-results/
- Ubuntu Package Tracker — libgconf-2-4 (removed): https://packages.ubuntu.com/search?keywords=libgconf-2-4
- Ubuntu 24.04 t64 transition notes: https://wiki.ubuntu.com/NobleNumbat/ReleaseNotes
- Local verification of package availability via apt-cache

## Issues Found
1. **Outdated minimum Ubuntu version**: The "System Requirements" section listed Ubuntu 18.04 or later. Ubuntu 18.04 reached end of standard support in May 2023, and MongoDB Compass's current install documentation recommends Ubuntu 20.04 LTS or later. Updated the requirement to "Ubuntu 20.04 LTS or later (64-bit)".

2. **Deprecated/removed `libgconf-2-4` dependency in troubleshooting**: The troubleshooting `apt install` command included `libgconf-2-4`, which was removed from the Ubuntu archive starting with 22.04 (the upstream `gconf` library is deprecated and modern Electron releases no longer depend on it). Running the original command on Ubuntu 22.04+ would fail with "Unable to locate package libgconf-2-4". Removed `libgconf-2-4` and added `libnss3` instead, which is a commonly missing dependency for Electron-based applications such as Compass.

3. **Ubuntu 24.04 `t64` library naming**: Ubuntu 24.04 LTS (Noble Numbat) renamed many libraries to their `t64` variants as part of the 64-bit `time_t` ABI transition (e.g., `libasound2` → `libasound2t64`, `libatk1.0-0` → `libatk1.0-0t64`, `libgtk-3-0` → `libgtk-3-0t64`, `libatk-bridge2.0-0` → `libatk-bridge2.0-0t64`). The original `apt install` would fail on 24.04 because several of those package names no longer resolve. Added a separate command listing the `t64` variants for Ubuntu 24.04 users while keeping the original (slightly corrected) command for Ubuntu 22.04.

## Review Notes
- The Compass version pinned in the examples (`1.44.0`) was a real release. By the post's publication date in 2026 a newer Compass minor release is likely available; the post already notes "Check the MongoDB Compass releases page for the latest version number" and uses `NEW_VERSION` placeholders in the update section, so the pinned version is acceptable as an example.
- The download URL pattern `https://downloads.mongodb.com/compass/mongodb-compass_<version>_amd64.deb` matches MongoDB's official distribution scheme.
- `mongodb-compass --version` is the correct CLI flag for the bundled binary.
- The connection-string examples, including TLS options (`tls=true`, `tlsCAFile`) and the `authSource=admin` parameter, are valid per the official MongoDB connection-string reference.
- The aggregation pipeline syntax (`$match`, `$group` with `$sum`/`$avg`, `$sort`) and the filter/projection/sort document syntax are all standard MongoDB query language.
- `db.grantRolesToUser("user", [{ role: "readAnyDatabase", db: "admin" }])` is the correct signature.
- The IXSCAN vs COLLSCAN terminology in the Explain Plan section is accurate.
- The readonly Compass build URL pattern (`mongodb-compass-readonly_<version>_amd64.deb`) is correct per MongoDB's distribution layout.
- Future maintenance: as Compass continues to evolve, the menu/tab names ("Schema", "Documents", "Aggregations", "Indexes", "Performance") and the description of the Explain button icon may drift; revisit if the UI changes substantially.
