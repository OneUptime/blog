# How to Write Custom Ceph Manager Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Python, Module Development, Automation

Description: Learn how to write custom Ceph Manager modules in Python to extend cluster management with custom commands, background tasks, and REST endpoints.

---

Custom Ceph Manager modules let you extend Ceph's management capabilities with Python code that has full access to cluster state, configuration, and the monitoring framework. This guide covers the complete process from writing to deploying a production-ready module.

## Module File Structure

Create a directory under the manager module path:

```text
/usr/share/ceph/mgr/
    mymodule/
        module.py
        requirements.txt   (optional)
```

## Module Skeleton

A complete module template:

```python
from mgr_module import MgrModule, CLIReadCommand, CLIWriteCommand
import threading

class Module(MgrModule):
    MODULE_OPTIONS = [
        {
            "name": "poll_interval",
            "type": "int",
            "default": 60,
            "desc": "Seconds between polls"
        }
    ]

    COMMANDS = []  # Use decorators instead

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._running = False
        self.event = threading.Event()

    @CLIReadCommand("mymodule status")
    def cmd_status(self) -> tuple:
        interval = self.get_module_option("poll_interval")
        return 0, f"Running, interval={interval}s", ""

    @CLIWriteCommand("mymodule set-interval")
    def cmd_set_interval(self, seconds: int) -> tuple:
        self.set_module_option("poll_interval", seconds)
        return 0, f"Interval set to {seconds}s", ""

    def serve(self):
        self._running = True
        self.log.info("mymodule started")
        while self._running:
            self._collect_data()
            self.event.wait(timeout=self.get_module_option("poll_interval"))
            self.event.clear()

    def _collect_data(self):
        # Access cluster state
        osd_map = self.get_osd_map()
        num_osds = len(osd_map["osds"])
        self.log.debug(f"Cluster has {num_osds} OSDs")

    def shutdown(self):
        self._running = False
        self.event.set()
```

## Accessing Cluster State

Key methods available in all modules:

```python
# Cluster maps
self.get_osd_map()          # Full OSD map
self.get_mon_map()          # Monitor map
self.get_fs_map()           # File system map

# Configuration
self.get_module_option("poll_interval")
self.set_module_option("poll_interval", 30)

# Pool and OSD stats
self.get_all_perf_counters()
self.get_pool_stats()

# Execute CLI commands
ret, out, err = self.mon_command({
    "prefix": "osd df",
    "format": "json"
})
```

## Deploying the Module

Copy the module directory to all manager nodes:

```bash
sudo cp -r mymodule /usr/share/ceph/mgr/
```

Enable and verify:

```bash
ceph mgr module enable mymodule
ceph mymodule status
```

## Writing Tests

Test the module logic with Python unittest:

```python
from unittest.mock import MagicMock, patch
import unittest

class TestMyModule(unittest.TestCase):
    def setUp(self):
        # Mock the MgrModule parent
        patcher = patch("mgr_module.MgrModule.__init__", return_value=None)
        patcher.start()

    def test_collect_data(self):
        from mymodule.module import Module
        mod = Module.__new__(Module)
        mod.log = MagicMock()
        mod.get_osd_map = MagicMock(return_value={"osds": [{}, {}]})
        mod._collect_data()
        mod.log.debug.assert_called_once()
```

## Summary

Custom Ceph Manager modules are Python classes inheriting from `MgrModule` that register CLI commands via decorators, run background tasks in `serve()`, and access cluster state through built-in methods. After copying the module directory to all manager nodes and enabling it, the module's commands are immediately available through the `ceph` CLI.
