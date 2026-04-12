# Validation Summary: How to Configure MySQL Connector/C++

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Connector/C++ (Legacy JDBC-like API)
- MySQL X DevAPI (mentioned)
- C++ with std::unique_ptr (RAII memory management)
- CMake build system
- g++ compiler
- SSL/TLS for MySQL connections

## Sources Consulted
- MySQL Connector/C++ Developer Guide — Legacy C++ API: https://dev.mysql.com/doc/connector-cpp/en/
- MySQL Connector/C++ API Reference — sql::mysql::get_mysql_driver_instance(), sql::Connection, sql::PreparedStatement, sql::ResultSet: https://dev.mysql.com/doc/dev/connector-cpp/
- MySQL Connector/C++ installation documentation: https://dev.mysql.com/doc/connector-cpp/en/connector-cpp-installation.html
- MySQL Client Error Reference (error codes 2006 CR_SERVER_GONE_ERROR, 2013 CR_SERVER_LOST): https://dev.mysql.com/doc/mysql-errors/en/client-error-reference.html
- libmysqlcppconn-dev package header file layout on Debian/Ubuntu

## Issues Found

1. **Incorrect g++ include path (`-I/usr/include/cppconn`)**
   - **What was wrong:** The compilation command used `-I/usr/include/cppconn` as the include path. However, the code uses `#include <cppconn/statement.h>`, which with that flag would resolve to `/usr/include/cppconn/cppconn/statement.h` — a path that does not exist. The `libmysqlcppconn-dev` package installs headers to `/usr/include/` (e.g., `/usr/include/mysql_driver.h` and `/usr/include/cppconn/statement.h`), which is already in the compiler's default search path.
   - **What was changed:** Removed the `-I/usr/include/cppconn` flag from the g++ command, since the default include path already covers `/usr/include`.
   - **Why:** With the incorrect flag, compilation would fail with "file not found" errors for `<cppconn/statement.h>` and related headers.

2. **CMake snippet used vcpkg-specific package name**
   - **What was wrong:** The CMake example used `find_package(unofficial-mysql-connector-cpp CONFIG REQUIRED)` and `target_link_libraries(myapp unofficial::mysql-connector-cpp::connector)`. The `unofficial-mysql-connector-cpp` package name is specific to vcpkg, but the blog post never mentions vcpkg. For users who installed the library via their system package manager (apt/yum as shown earlier in the post), this CMake configuration would fail.
   - **What was changed:** Replaced with a standard CMake setup that links directly against `mysqlcppconn`, which works with system-installed packages. Also added `set(CMAKE_CXX_STANDARD 17)` to match the C++17 standard used in the g++ command.
   - **Why:** The CMake snippet should be consistent with the installation method described in the same post (system package manager), not require an unmentioned dependency manager.

## Review Notes
- The post correctly recommends the legacy JDBC-like API for classic MySQL protocol usage. The X DevAPI is mentioned in the overview but not demonstrated, which is appropriate given the post's focus.
- The SSL configuration options (`sslCA`, `sslCert`, `sslKey`, `OPT_SSL_VERIFY_SERVER_CERT`) and the `sql::ConnectOptionsMap` usage are correct for the legacy API.
- Error codes 2006 (CR_SERVER_GONE_ERROR) and 2013 (CR_SERVER_LOST) are correctly identified for connection loss handling.
- The `conn->reconnect()` method is available in the legacy API but users should note it reuses the original connection parameters; if credentials have rotated, a fresh connection must be created instead.
- The RHEL/CentOS installation command uses `yum`; modern RHEL 8+ systems use `dnf`, though `yum` is typically aliased to `dnf` on those systems so it still works.
