# How to Compile and Deploy Object Classes in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Object Class, Build, Deployment, OSD, Plugin

Description: Compile custom Ceph object class plugins from source and deploy them to OSD nodes so they are available for RADOS clients to invoke.

---

After writing an object class, you need to compile it into a shared library and deploy it to every OSD node. This guide covers building against the Ceph development headers, deploying the `.so` file, and reloading OSDs to make the class available.

## Setting Up the Build Environment

```bash
# Install Ceph development headers
apt install rados-objclass-dev librados-dev  # Debian/Ubuntu
dnf install rados-objclass-devel librados-devel  # RHEL/CentOS

# Verify headers are available
ls /usr/include/rados/
ls /usr/include/objclass/objclass.h
```

## Building with cmake

Create the build directory and compile:

```bash
# Project structure
mkdir -p myclass/{build}
cd myclass

# myclass.cc and CMakeLists.txt already exist (from the writing guide)
cat CMakeLists.txt
```

```cmake
cmake_minimum_required(VERSION 3.10)
project(cls_myclass)

# Find Ceph include paths
execute_process(
    COMMAND ceph --version
    OUTPUT_VARIABLE CEPH_VERSION
    OUTPUT_STRIP_TRAILING_WHITESPACE
)
message(STATUS "Building for Ceph: ${CEPH_VERSION}")

include_directories(/usr/include)
include_directories(/usr/include/rados)

add_library(cls_myclass SHARED myclass.cc)
target_compile_options(cls_myclass PRIVATE -fPIC -O2 -Wall)
set_target_properties(cls_myclass PROPERTIES
    PREFIX ""
    SUFFIX ".so"
)
install(TARGETS cls_myclass
    LIBRARY DESTINATION /usr/lib/rados-classes/
)
```

```bash
cd build
cmake ..
make -j$(nproc)
ls -la cls_myclass.so
```

## Building Without cmake (Makefile)

```makefile
# Makefile
CXX = g++
CXXFLAGS = -fPIC -O2 -Wall -I/usr/include -I/usr/include/rados
LDFLAGS = -shared

cls_myclass.so: myclass.cc
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -o $@ $<

install: cls_myclass.so
	install -m 644 cls_myclass.so /usr/lib/rados-classes/

clean:
	rm -f cls_myclass.so
```

```bash
make
sudo make install
```

## Deploying to OSD Nodes

Object classes must be present on every OSD node. Use a deployment tool or manual copy:

```bash
#!/bin/bash
# deploy-object-class.sh

OSD_NODES="osd1 osd2 osd3 osd4 osd5"
CLASS_SO="cls_myclass.so"
DEST="/usr/lib/rados-classes/"

for node in ${OSD_NODES}; do
  echo "Deploying to ${node}..."
  scp ${CLASS_SO} root@${node}:${DEST}
  ssh root@${node} "chmod 644 ${DEST}${CLASS_SO} && chown root:root ${DEST}${CLASS_SO}"
done

echo "Deployment complete."
```

## Reloading OSD Processes

Object classes are loaded dynamically when first called - you do not need to restart OSDs after deploying a new class. However, if you update an existing class, you must restart the OSDs that have already loaded the old version:

```bash
# Restart all OSDs on a node (rolling restart recommended in production)
systemctl restart ceph-osd@\*

# Restart a specific OSD
systemctl restart ceph-osd@3

# Verify the class loads without errors
ceph osd pool ls  # Just to trigger OSD activity
grep "myclass" /var/log/ceph/ceph-osd.*.log | grep -i "load\|error"
```

## Verifying Deployment

```bash
# Test from a client node using rados
rados -p mypool ls  # Create a test object first if needed
echo "hello world test" | rados -p mypool put test-obj -

# Call the object class method via the librados Python API
# (the rados CLI does not have a subcommand for invoking class methods)
python3 << 'PYEOF'
import rados
cluster = rados.Rados(conffile='/etc/ceph/ceph.conf')
cluster.connect()
ioctx = cluster.open_ioctx('mypool')
result = ioctx.execute('test-obj', 'myclass', 'count_words', b'')
print(result)
ioctx.close()
cluster.shutdown()
PYEOF
```

## Troubleshooting

```bash
# Check OSD logs for class loading errors
journalctl -u ceph-osd@0 | grep -i "class\|myclass\|plugin"

# Verify the .so file architecture matches the OSD binary
file /usr/lib/rados-classes/cls_myclass.so
file /usr/bin/ceph-osd

# Check that all dependencies are satisfied
ldd /usr/lib/rados-classes/cls_myclass.so
```

## Summary

Deploying a Ceph object class requires compiling the C++ plugin as a shared library with `-fPIC`, installing it to `/usr/lib/rados-classes/` on every OSD node, and verifying it loads without errors. New classes are loaded on first use without requiring OSD restarts. Updating existing classes requires rolling OSD restarts to replace the cached version. Use deployment automation (Ansible, Puppet) to keep all OSD nodes in sync when rolling out class updates across a large cluster.
