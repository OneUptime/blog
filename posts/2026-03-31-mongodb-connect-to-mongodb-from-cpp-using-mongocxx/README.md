# How to Connect to MongoDB from C++ Using the mongocxx Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, C++, mongocxx, Driver, Connection

Description: Learn how to install the mongocxx driver, create a MongoClient instance in C++, and verify connectivity to a MongoDB deployment.

---

## Introduction

The official MongoDB C++ driver (mongocxx) provides a modern C++11 API for connecting to and querying MongoDB. It is built on top of the C driver (mongoc) and provides RAII-based resource management, BSON document builders, and full access to MongoDB operations.

## Installation

Install via vcpkg or build from source:

```bash
# Using vcpkg
vcpkg install mongo-cxx-driver

# Or via package manager on Ubuntu
sudo apt-get install libmongocxx-dev libbsoncxx-dev
```

CMakeLists.txt:

```cmake
cmake_minimum_required(VERSION 3.15)
project(MyMongoApp)

find_package(mongocxx REQUIRED)
find_package(bsoncxx  REQUIRED)

add_executable(app main.cpp)
target_link_libraries(app PRIVATE mongo::mongocxx_shared mongo::bsoncxx_shared)
```

## Initializing the Driver

The driver requires a single `mongocxx::instance` per process:

```cpp
#include <mongocxx/client.hpp>
#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>
#include <iostream>

int main() {
    // Must be created once per process
    mongocxx::instance instance{};

    // Create a client
    mongocxx::client client{ mongocxx::uri{ "mongodb://localhost:27017" } };

    std::cout << "Connected to MongoDB" << std::endl;
    return 0;
}
```

## Connection with Options

```cpp
#include <mongocxx/options/client.hpp>
#include <mongocxx/options/tls.hpp>

mongocxx::options::client client_opts;

mongocxx::options::tls tls_opts;
tls_opts.allow_invalid_certificates(false);
client_opts.tls_opts(tls_opts);

mongocxx::client client{
    mongocxx::uri{ "mongodb+srv://user:pass@cluster.mongodb.net/mydb?tls=true" },
    client_opts
};
```

## Verifying Connectivity

```cpp
#include <bsoncxx/builder/stream/document.hpp>
#include <bsoncxx/json.hpp>

auto admin = client["admin"];
auto result = admin.run_command(
    bsoncxx::builder::stream::document{} << "ping" << 1
    << bsoncxx::builder::stream::finalize
);

std::cout << "Ping: " << bsoncxx::to_json(result.view()) << std::endl;
```

## Accessing Database and Collection

```cpp
// Get a database
auto db = client["shop"];

// Get a collection
auto products = db["products"];

// The collection object is lightweight; obtain it per-operation
auto name = products.name();
std::cout << "Collection: " << name << std::endl;
```

## Thread Safety

`mongocxx::client` is NOT thread-safe. Use a `mongocxx::pool` for multi-threaded applications:

```cpp
#include <mongocxx/pool.hpp>

mongocxx::pool pool{ mongocxx::uri{ "mongodb://localhost:27017" } };

// In each thread:
auto entry  = pool.acquire();
auto& client_ref = *entry;
auto products = client_ref["shop"]["products"];
```

## Summary

The mongocxx driver requires initializing `mongocxx::instance` once at startup, then creating a `mongocxx::client` with a URI. Use `db.run_command(ping)` to verify connectivity. For multi-threaded servers, use `mongocxx::pool` to safely share connections, acquiring a client entry per thread or request.
