# How to Perform CRUD Operations with the MongoDB C++ Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, C++, mongocxx, CRUD, BSON

Description: A practical guide to inserting, querying, updating, and deleting MongoDB documents using the mongocxx C++ driver with BSON document builders.

---

## Introduction

The mongocxx driver exposes CRUD operations through collection objects. Documents are constructed using BSON builder helpers and results are returned as iterable `mongocxx::cursor` objects. All operations follow RAII principles and are synchronous.

## Includes and Setup

```cpp
#include <mongocxx/client.hpp>
#include <mongocxx/instance.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <bsoncxx/builder/stream/array.hpp>
#include <bsoncxx/json.hpp>
#include <iostream>

using bsoncxx::builder::stream::document;
using bsoncxx::builder::stream::finalize;
using bsoncxx::builder::stream::open_array;
using bsoncxx::builder::stream::close_array;
using bsoncxx::builder::stream::open_document;
using bsoncxx::builder::stream::close_document;

mongocxx::instance instance{};
mongocxx::client   client{ mongocxx::uri{ "mongodb://localhost:27017" } };
auto               products = client["shop"]["products"];
```

## Create - Inserting Documents

```cpp
// Insert one document
auto doc = document{}
    << "name"     << "Laptop"
    << "price"    << 999.99
    << "category" << "electronics"
    << "inStock"  << true
    << finalize;

auto result = products.insert_one(doc.view());
if (result) {
    std::cout << "Inserted: " << result->inserted_id().get_oid().value.to_string() << std::endl;
}

// Insert many
std::vector<bsoncxx::document::value> docs;
docs.push_back(document{} << "name" << "Mouse" << "price" << 29.99 << finalize);
docs.push_back(document{} << "name" << "Desk"  << "price" << 199.0 << finalize);

auto many_result = products.insert_many(docs);
std::cout << "Inserted: " << many_result->inserted_count() << std::endl;
```

## Read - Querying Documents

```cpp
// Find all in category
auto filter = document{} << "category" << "electronics" << finalize;
auto cursor = products.find(filter.view());

for (auto& doc : cursor) {
    std::cout << bsoncxx::to_json(doc) << std::endl;
}

// Find one
auto one = products.find_one(document{} << "name" << "Laptop" << finalize);
if (one) {
    std::cout << "Found: " << bsoncxx::to_json(one->view()) << std::endl;
}

// With sort and limit
mongocxx::options::find find_opts{};
find_opts.sort(document{} << "price" << 1 << finalize);
find_opts.limit(10);
auto sorted = products.find(document{} << "inStock" << true << finalize, find_opts);
```

## Update - Modifying Documents

```cpp
// Update one
auto update_filter = document{} << "name" << "Laptop" << finalize;
auto update_doc    = document{} << "$set" << open_document
    << "price" << 899.99
    << close_document << finalize;

products.update_one(update_filter.view(), update_doc.view());

// Update many
auto many_filter = document{} << "category" << "electronics" << finalize;
auto inc_doc     = document{} << "$inc" << open_document << "views" << 1 << close_document << finalize;
products.update_many(many_filter.view(), inc_doc.view());
```

## Delete - Removing Documents

```cpp
// Delete one
auto del_result = products.delete_one(
    document{} << "name" << "Mouse" << finalize
);
std::cout << "Deleted: " << del_result->deleted_count() << std::endl;

// Delete many
products.delete_many(
    document{} << "inStock" << false << finalize
);
```

## Summary

mongocxx CRUD operations use BSON stream builders to construct filter and update documents. Insert with `insert_one`/`insert_many`, query with `find`/`find_one` returning iterable cursors, modify with `update_one`/`update_many` using `$set` and other operators, and remove with `delete_one`/`delete_many`. All results carry counts and identifiers you can inspect for error handling.
