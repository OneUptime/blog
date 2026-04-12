# How to Configure MySQL Connector/C++

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, C++, Connector, Configuration, Driver

Description: Learn how to install, configure, and use MySQL Connector/C++ to build native C++ applications that connect to MySQL databases.

---

## Overview

MySQL Connector/C++ is the official C++ driver for MySQL. It provides two APIs: the newer X DevAPI (using the X Protocol) and the legacy JDBC-like API. For most applications using the classic MySQL protocol, the legacy API remains the preferred choice due to its wider compatibility.

## Installing MySQL Connector/C++

```bash
# On Ubuntu/Debian
sudo apt-get install libmysqlcppconn-dev

# On RHEL/CentOS
sudo yum install mysql-connector-c++-devel

# Or download from mysql.com and build from source
cmake -DCMAKE_INSTALL_PREFIX=/usr/local ..
make && sudo make install
```

## Basic Connection with the Legacy API

The legacy API uses `sql::mysql::get_mysql_driver_instance()` to obtain a driver and create connections:

```cpp
#include <mysql_driver.h>
#include <mysql_connection.h>
#include <cppconn/statement.h>
#include <cppconn/resultset.h>
#include <cppconn/exception.h>
#include <memory>
#include <iostream>

int main() {
    try {
        sql::mysql::MySQL_Driver* driver =
            sql::mysql::get_mysql_driver_instance();

        std::unique_ptr<sql::Connection> conn(
            driver->connect("tcp://localhost:3306", "app_user", "secure_password")
        );

        conn->setSchema("myapp");

        std::unique_ptr<sql::Statement> stmt(conn->createStatement());
        std::unique_ptr<sql::ResultSet> res(
            stmt->executeQuery("SELECT id, name FROM users LIMIT 5")
        );

        while (res->next()) {
            std::cout << "ID: " << res->getInt("id")
                      << ", Name: " << res->getString("name") << "\n";
        }
    } catch (sql::SQLException& e) {
        std::cerr << "SQL Error: " << e.what()
                  << " (MySQL error code: " << e.getErrorCode() << ")\n";
    }
    return 0;
}
```

## Using Prepared Statements

Always use prepared statements to prevent SQL injection:

```cpp
std::unique_ptr<sql::PreparedStatement> pstmt(
    conn->prepareStatement(
        "SELECT id, email FROM users WHERE id = ? AND active = ?"
    )
);

pstmt->setInt(1, 42);
pstmt->setBoolean(2, true);

std::unique_ptr<sql::ResultSet> res(pstmt->executeQuery());
while (res->next()) {
    std::cout << res->getString("email") << "\n";
}
```

## Configuring SSL

Enable SSL to secure connections to remote servers:

```cpp
sql::ConnectOptionsMap options;
options["hostName"]    = "db.example.com";
options["port"]        = 3306;
options["userName"]    = "app_user";
options["password"]    = "secure_password";
options["schema"]      = "myapp";
options["sslCA"]       = "/path/to/ca-cert.pem";
options["sslCert"]     = "/path/to/client-cert.pem";
options["sslKey"]      = "/path/to/client-key.pem";
options["OPT_SSL_VERIFY_SERVER_CERT"] = true;

std::unique_ptr<sql::Connection> conn(driver->connect(options));
```

## Compiling with Connector/C++

Use the following compilation flags:

```bash
g++ -o myapp main.cpp \
    -lmysqlcppconn \
    -std=c++17
```

Or with CMake:

```cmake
cmake_minimum_required(VERSION 3.10)
project(MyApp)

set(CMAKE_CXX_STANDARD 17)

add_executable(myapp main.cpp)
target_link_libraries(myapp mysqlcppconn)
```

## Handling Exceptions and Reconnections

Wrap all database operations in try-catch blocks and implement reconnection logic:

```cpp
bool execute_with_retry(sql::Connection* conn, const std::string& query) {
    int attempts = 0;
    while (attempts < 3) {
        try {
            if (conn->isClosed()) {
                conn->reconnect();
            }
            std::unique_ptr<sql::Statement> stmt(conn->createStatement());
            stmt->execute(query);
            return true;
        } catch (sql::SQLException& e) {
            if (e.getErrorCode() == 2006 || e.getErrorCode() == 2013) {
                // MySQL server has gone away or lost connection
                attempts++;
                continue;
            }
            throw;
        }
    }
    return false;
}
```

## Summary

MySQL Connector/C++ provides a type-safe, object-oriented interface for C++ applications to interact with MySQL. The key configuration steps are installing the development headers, linking against `libmysqlcppconn`, using prepared statements for all parameterized queries, configuring SSL for remote connections, and wrapping operations in exception handlers that handle connection loss errors (error codes 2006 and 2013). These practices ensure reliable, secure database access from C++ applications.
