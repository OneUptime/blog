# How to Use Redis in C++ with redis-plus-plus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, C++, redis-plus-plus, Systems Programming, STL

Description: Learn how to use Redis in C++ with the redis-plus-plus library, covering connections, STL-friendly command wrappers, pipelines, and transactions.

---

`redis-plus-plus` is a modern C++ Redis client built on top of hiredis. It provides STL-friendly APIs, connection pooling, pipelines, transactions, and Pub/Sub out of the box.

## Installation

```bash
# Install hiredis first
sudo apt-get install libhiredis-dev

# Build redis-plus-plus
git clone https://github.com/sewenew/redis-plus-plus.git
cd redis-plus-plus && mkdir build && cd build
cmake ..
make && sudo make install
```

CMake integration:

```cmake
find_package(redis++ REQUIRED)
target_link_libraries(myapp redis++::redis++)
```

## Basic Connection and Operations

```cpp
#include <sw/redis++/redis++.h>
#include <iostream>
#include <optional>

int main() {
    sw::redis::Redis redis("tcp://127.0.0.1:6379");

    // SET and GET
    redis.set("user:1:name", "Alice");
    auto name = redis.get("user:1:name");
    if (name) std::cout << "Name: " << *name << "\n";

    // SETEX (with expiry)
    redis.setex("session:abc", 3600, "user:42");

    // INCR
    auto count = redis.incr("visits");
    std::cout << "Visits: " << count << "\n";

    // DEL
    redis.del("visits");

    return 0;
}
```

## Hash Operations

```cpp
// HSET (C++17 initializer list)
redis.hset("profile:1", {
    std::make_pair("city", "Berlin"),
    std::make_pair("age", "30")
});

auto city = redis.hget("profile:1", "city");
if (city) std::cout << "City: " << *city << "\n";

// HGETALL into a map
std::unordered_map<std::string, std::string> fields;
redis.hgetall("profile:1", std::inserter(fields, fields.end()));
for (const auto& [k, v] : fields) {
    std::cout << k << ": " << v << "\n";
}
```

## Pipeline

```cpp
auto pipe = redis.pipeline();

for (int i = 0; i < 100; ++i) {
    pipe.set("item:" + std::to_string(i), std::to_string(i));
}

auto replies = pipe.exec();
std::cout << "Executed " << replies.size() << " commands\n";
```

## Transactions

```cpp
auto tx = redis.transaction();
try {
    // MULTI is sent automatically by the transaction object
    tx.set("balance:alice", "70");
    tx.set("balance:bob", "80");
    auto result = tx.exec();
    std::cout << "Transaction committed\n";
} catch (const sw::redis::Error& e) {
    std::cerr << "Error: " << e.what() << "\n";
}
```

## Pub/Sub

```cpp
auto sub = redis.subscriber();

sub.on_message([](std::string channel, std::string msg) {
    std::cout << "[" << channel << "] " << msg << "\n";
});

sub.subscribe("events");

// Consume messages in a loop
while (true) {
    try {
        sub.consume();
    } catch (const sw::redis::Error& e) {
        std::cerr << e.what() << "\n";
        break;
    }
}
```

## Connection Pool Options

```cpp
sw::redis::ConnectionPoolOptions pool_opts;
pool_opts.size = 10;
pool_opts.wait_timeout = std::chrono::milliseconds(100);

sw::redis::ConnectionOptions conn_opts;
conn_opts.host = "127.0.0.1";
conn_opts.port = 6379;
conn_opts.socket_timeout = std::chrono::milliseconds(200);

sw::redis::Redis redis(conn_opts, pool_opts);
```

## Summary

`redis-plus-plus` provides a modern C++ API with `std::optional` returns, STL insert iterators for bulk reads, RAII-safe connections, and a fluent pipeline builder. Use connection pool options for multi-threaded applications and handle `sw::redis::Error` exceptions for robust production code.
