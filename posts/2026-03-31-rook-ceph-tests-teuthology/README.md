# How to Run Ceph Tests with Teuthology

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Teuthology, Testing, Integration Test, CI

Description: Use Teuthology, the Ceph integration testing framework, to run end-to-end tests against real Ceph clusters for regression testing and release validation.

---

Teuthology is the distributed test framework used by the Ceph project for integration testing. It orchestrates test jobs across multiple machines, managing cluster provisioning, test execution, and results collection for comprehensive Ceph validation.

## Teuthology Architecture

Teuthology consists of:
- **teuthology**: the test runner and task framework
- **teuthology-dispatcher**: picks up jobs from the queue and runs them via teuthology-supervisor
- **paddles**: RESTful API backend for storing and querying test results
- **pulpito**: web dashboard frontend that displays results from paddles

Tests are defined in YAML files called "suites" that describe which tasks to run.

## Installing Teuthology

```bash
# Clone teuthology
git clone https://github.com/ceph/teuthology.git
cd teuthology

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install teuthology using the bootstrap script
./bootstrap

# Activate the virtualenv created by bootstrap
source venv/bin/activate

# Verify installation
teuthology --version
```

## A Simple Test Suite File

```yaml
# my-basic-suite.yaml
description: Basic Ceph functionality test
roles:
  - [mon.0, osd.0, osd.1, osd.2, client.0]

tasks:
  - install:
      branch: main
  - ceph:
      conf:
        global:
          osd_pool_default_size: 3
          osd_pool_default_min_size: 1
  - rados:
      clients: [client.0]
      time: 60
      op_weights:
        read: 100
        write: 100
        delete: 10
  - s3tests:
      client.0:
        s3tests:
          access_key: testuser
          secret_key: testpass
```

## Running Tests Locally with teuthology-suite

```bash
# Schedule a suite run against the test lab
teuthology-suite \
  --suite ceph/basic \
  --ceph main \
  --machine-type vps \
  --distro ubuntu \
  --distro-version 22.04

# Run a specific yaml file directly
teuthology \
  --lock \
  --suite-path /path/to/suite \
  my-basic-suite.yaml
```

## Running Tests Against a Local Cluster

```bash
# Use the 'dummy' machine type for testing against localhost
cat > local-test.yaml << 'EOF'
description: Local cluster test
roles:
  - [client.0]
overrides:
  ceph:
    conf:
      global:
        log_to_stderr: true

tasks:
  - exec:
      client.0:
        - ceph status
        - rados -p testpool bench 10 write --no-cleanup
        - rados -p testpool bench 10 seq
EOF

teuthology --owner yourname@example.com local-test.yaml
```

## Writing Custom Teuthology Tasks

```python
# my_task.py - A custom teuthology task
import logging
from teuthology.task import Task

log = logging.getLogger(__name__)


class MyCephTask(Task):
    """
    Custom task that verifies RGW bucket creation.

    Example config:
      tasks:
        - my_task:
            client: client.0
            bucket_count: 10
    """

    def setup(self):
        super().setup()
        self.bucket_count = self.config.get("bucket_count", 5)

    def begin(self):
        client = self.config.get("client", "client.0")
        ctx = self.ctx
        log.info("Creating %d test buckets", self.bucket_count)
        for i in range(self.bucket_count):
            ctx.cluster.only(client).run(
                args=["aws", "s3", "mb", f"s3://test-bucket-{i}",
                      "--endpoint-url", "http://localhost:7480"]
            )

    def end(self):
        log.info("MyCephTask cleanup complete")


task = MyCephTask
```

## Analyzing Test Results

```bash
# Submit results to paddles from a local archive
teuthology-results \
  --name ceph-main-2026-03-31 \
  --archive-dir /path/to/archive

# Report results to paddles
teuthology-report \
  --run ceph-main-2026-03-31

# List jobs in an archive directory
teuthology-ls /path/to/archive/ceph-main-2026-03-31 -v
```

## Summary

Teuthology provides a powerful framework for end-to-end Ceph integration testing across real hardware. By writing YAML suite files that combine built-in tasks like `ceph`, `rados`, and `s3tests` with custom Python tasks, you can validate complex Ceph behaviors that unit tests cannot cover and build a regression test suite that catches issues before they reach production.
