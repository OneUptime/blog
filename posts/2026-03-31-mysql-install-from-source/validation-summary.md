# Validation Summary: How to Install MySQL from Source Code

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.36
- CMake build system
- systemd service management
- Ubuntu / Debian package management (apt)
- Rocky Linux / AlmaLinux / CentOS Stream package management (dnf)
- Boost C++ Libraries

## Sources Consulted
- MySQL 8.0 Source Installation Prerequisites: https://dev.mysql.com/doc/refman/8.0/en/source-installation-prerequisites.html
- MySQL 8.0 Source Configuration Options: https://dev.mysql.com/doc/refman/8.0/en/source-configuration-options.html
- MySQL 8.0.36 cmake/boost.cmake on GitHub: https://github.com/mysql/mysql-server/blob/mysql-8.0.36/cmake/boost.cmake
- Ubuntu 22.04 libboost-dev package: https://packages.ubuntu.com/jammy/libboost-dev
- Rocky Linux 9 systemd-devel package: https://pkgs.org/download/systemd-devel
- MySQL Blog - Building MySQL with Boost: https://dev.mysql.com/blog-archive/building-mysql-with-boost/

## Issues Found

### Issue 1: Boost version mismatch and incorrect WITH_BOOST path
- **What was wrong:** The post installed system Boost packages (`libboost-dev` on Ubuntu, `boost-devel` on Rocky Linux) and used `-DWITH_BOOST=/usr/include/boost`. This had two problems: (a) MySQL 8.0.36 requires exactly Boost 1.77.0, but Ubuntu 22.04 ships 1.74.0 and Rocky Linux 9 ships 1.75.0, so the build would fail with a version mismatch error; (b) the `-DWITH_BOOST` path should point to the parent directory containing the `boost/` subdirectory, not to the `boost/` directory itself.
- **What was changed:** Removed `libboost-dev` from Ubuntu/Debian dependencies and `boost-devel` from Rocky Linux dependencies. Replaced `-DWITH_BOOST=/usr/include/boost` with `-DDOWNLOAD_BOOST=1 -DWITH_BOOST=/tmp/boost` so CMake automatically downloads the correct Boost version.
- **Why:** MySQL's CMake build system checks for an exact Boost version. Using `DOWNLOAD_BOOST=1` is the most reliable approach as it fetches the precisely required version automatically.

### Issue 2: Incorrect package name on Rocky Linux
- **What was wrong:** The Rocky Linux dependency list included `libudev-devel`, which is not a valid package name on RHEL-based distributions (EL9).
- **What was changed:** Replaced `libudev-devel` with `systemd-devel`, which provides the libudev development headers on Rocky Linux 9 / AlmaLinux / CentOS Stream.
- **Why:** On RHEL-family distributions, libudev headers are bundled into the `systemd-devel` package. The `libudev-devel` package name only exists on some other distributions (e.g., OpenMandriva).

## Review Notes
- The post targets MySQL 8.0.36 which is a valid release but not the latest 8.0.x. Users may want to check for newer 8.0.x releases.
- The mermaid diagram shows `cmake -DCMAKE_INSTALL_PREFIX=/opt/mysql .` (in-source build) while the actual instructions correctly use an out-of-source build (`mkdir build && cd build; cmake ..`). This is an acceptable simplification for a flowchart.
- The `Type=notify` in the systemd unit is correct for MySQL 8.0, which supports systemd notification.
- The `/run/mysql` directory is ephemeral (tmpfs), so the `RuntimeDirectory=mysql` directive in the systemd unit correctly ensures it is recreated on boot.
