# How to Write Custom Sync Modules for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Sync, Development

Description: Learn how to write a custom Ceph RGW sync module in C++ to forward object operations to any external system beyond the built-in cloud and Elasticsearch modules.

---

## Overview

Ceph RGW's sync module framework allows developers to create custom data sync handlers that run within the RGW data sync coroutine. A custom sync module can forward object metadata and data to any external system - a database, a message queue, a proprietary API, or a monitoring system. This guide covers the C++ interfaces and build process.

## Understanding the Sync Module Interface

A sync module must implement two main classes:

```cpp
// The instantiated module - created by the factory
class RGWSyncModuleInstance {
public:
  virtual ~RGWSyncModuleInstance() {}
  virtual RGWDataSyncModule *get_data_handler() = 0;
};

// The data handler - called for each sync operation
class RGWDataSyncModule {
public:
  virtual ~RGWDataSyncModule() {}

  // Called when an object is written
  virtual RGWCoroutine *sync_object(const DoutPrefixProvider *dpp,
                                     RGWDataSyncCtx *sc,
                                     rgw_bucket_sync_pipe& sync_pipe,
                                     rgw_obj_key& key, ...) = 0;

  // Called when an object is deleted
  virtual RGWCoroutine *remove_object(const DoutPrefixProvider *dpp,
                                       RGWDataSyncCtx *sc,
                                       rgw_bucket_sync_pipe& sync_pipe,
                                       rgw_obj_key& key, ...) = 0;

  // Called when a delete marker is created (versioned buckets)
  virtual RGWCoroutine *create_delete_marker(const DoutPrefixProvider *dpp,
                                              RGWDataSyncCtx *sc,
                                              rgw_bucket_sync_pipe& sync_pipe,
                                              rgw_obj_key& key, ...) = 0;
};
```

## Step 1 - Set Up the Development Environment

```bash
# Clone Ceph source
git clone https://github.com/ceph/ceph.git
cd ceph
git checkout v18.2.0  # Use your Ceph version

# Install build dependencies
./install-deps.sh

# Configure the build
cmake -DCMAKE_BUILD_TYPE=Debug \
  -DWITH_MGR_DASHBOARD_FRONTEND=OFF \
  -B build .
```

## Step 2 - Create the Custom Sync Module Files

```bash
# Create module files
touch src/rgw/driver/rados/rgw_sync_module_custom.h
touch src/rgw/driver/rados/rgw_sync_module_custom.cc
```

```cpp
// src/rgw/driver/rados/rgw_sync_module_custom.h
#pragma once
#include "rgw_sync_module.h"

class RGWCustomSyncModuleInstance : public RGWSyncModuleInstance {
  RGWDataSyncModule* data_handler;
public:
  explicit RGWCustomSyncModuleInstance(CephContext* cct,
                                        const JSONFormattable& config);
  ~RGWCustomSyncModuleInstance() override;
  RGWDataSyncModule *get_data_handler() override;
};

class RGWCustomSyncModule : public RGWSyncModule {
public:
  RGWCustomSyncModule() {}
  bool supports_data_export() override { return false; }
  int create_instance(const DoutPrefixProvider *dpp,
                      CephContext *cct,
                      const JSONFormattable& config,
                      RGWSyncModuleInstanceRef *instance) override;
};
```

```cpp
// src/rgw/driver/rados/rgw_sync_module_custom.cc - simplified example
#include "rgw_sync_module_custom.h"
#include "rgw_cr_rest.h"

class RGWCustomDataSyncModule : public RGWDataSyncModule {
  std::string webhook_url;
public:
  explicit RGWCustomDataSyncModule(const std::string& url)
    : webhook_url(url) {}

  RGWCoroutine *sync_object(const DoutPrefixProvider *dpp,
                              RGWDataSyncCtx *sc, ...) override {
    // Return a coroutine that POSTs object metadata to webhook_url
    return new RGWPostRESTResourceCR(sc->env->cct, sc->conn,
                                      sc->env->http_manager,
                                      webhook_url, nullptr,
                                      object_metadata_json);
  }

  // Must also override remove_object() and create_delete_marker()
};
```

## Step 3 - Register the Module

```cpp
// In src/rgw/driver/rados/rgw_sync_module.cc, add:
#include "rgw_sync_module_custom.h"

// In rgw_register_sync_modules(), add:
RGWSyncModuleRef custom_module(std::make_shared<RGWCustomSyncModule>());
modules_manager->register_module("custom", custom_module);
```

```cmake
# In src/rgw/CMakeLists.txt, add:
# driver/rados/rgw_sync_module_custom.cc to the librgw_common_srcs list
```

## Step 4 - Build and Test

```bash
# Build only the RGW components
cd build
make radosgw -j$(nproc)

# Test the module
./bin/radosgw --rgw-zone=custom-zone \
  --rgw-zonegroup=default \
  --rgw-realm=myrealm \
  -d --no-mon-config 2>&1 | grep custom
```

## Step 5 - Configure the Zone to Use the Custom Module

```bash
# Create a zone with the custom tier type
radosgw-admin zone create \
  --rgw-zonegroup=default \
  --rgw-zone=custom-zone \
  --tier-type=custom \
  --access-key="${SYNC_ACCESS}" \
  --secret="${SYNC_SECRET}"

# Set module-specific configuration
radosgw-admin zone modify \
  --rgw-zone=custom-zone \
  --tier-config=webhook_url=https://webhook.example.com/ceph-events,\
include_data=false

radosgw-admin period update --commit
```

## Step 6 - Debug and Monitor

```bash
# Enable debug logging for your sync module
ceph config set client.rgw.custom-zone debug_rgw 20

# Check the module loads correctly
radosgw -n client.rgw.custom-zone --show-config-value rgw_zone

# Watch for sync operations
kubectl -n rook-ceph logs -l app=rook-ceph-rgw -f \
  | grep -i "custom\|sync_object\|remove_object"
```

## Summary

Writing a custom Ceph RGW sync module requires implementing the `RGWSyncModuleInstance` and `RGWDataSyncModule` interfaces in C++, registering the module type in the sync module manager, and building the Ceph RGW binary. The sync module receives coroutine-based callbacks for every object creation and deletion, enabling integration with arbitrary external systems while inheriting the reliability of Ceph's multisite sync infrastructure.
