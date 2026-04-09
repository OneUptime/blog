# How to Write a Hello World Module for Ceph Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Python, Module Development, Ceph Manager

Description: Learn how to write a minimal Hello World Ceph Manager module in Python to understand the module system and prepare for building custom extensions.

---

Ceph Manager (ceph-mgr) modules are Python plugins that extend Ceph's management capabilities. Writing a Hello World module is the best starting point to understand the module lifecycle, available APIs, and how to deploy custom code to a running cluster.

## Module File Structure

A Ceph Manager module lives in a directory under the manager's module path. The minimum required file is `module.py`:

```text
/usr/share/ceph/mgr/hello/
    module.py
```

## Writing module.py

Create the simplest possible module:

```python
from mgr_module import MgrModule

class Module(MgrModule):
    MODULE_OPTIONS = []
    COMMANDS = [
        {
            "cmd": "hello name=who,type=CephString,req=false",
            "desc": "Say hello",
            "perm": "r"
        }
    ]

    def handle_command(self, inbuf, cmd):
        who = cmd.get("who", "world")
        return 0, f"Hello, {who}!", ""
```

Key points:
- The class must inherit from `MgrModule`. The manager discovers it automatically by scanning for `MgrModule` subclasses
- `COMMANDS` defines CLI commands the module registers
- `handle_command` processes incoming commands

## Deploying the Module

Copy the module directory to all Manager nodes:

```bash
sudo mkdir -p /usr/share/ceph/mgr/hello
sudo cp module.py /usr/share/ceph/mgr/hello/
```

Enable the module:

```bash
ceph mgr module enable hello
```

## Testing the Command

Run the registered command to verify it works:

```bash
ceph hello
# Hello, world!

ceph hello --who Alice
# Hello, Alice!
```

## Adding a Background Service

Modules can also run a continuous background loop:

```python
from threading import Event
from mgr_module import MgrModule

class Module(MgrModule):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.event = Event()

    def serve(self):
        self.log.info("Hello module background service started")
        while not self.event.wait(timeout=60):
            self.log.debug("Hello module heartbeat")

    def shutdown(self):
        self.event.set()
```

The `serve()` method is called in a thread when the module starts, and `shutdown()` is called when it stops.

## Logging from a Module

Use the built-in logger for structured output:

```python
self.log.info("Module started")
self.log.warning("Something unusual happened")
self.log.error("A critical error occurred")
```

Logs appear in the manager's log file at `/var/log/ceph/ceph-mgr.*.log`.

## Summary

A Ceph Manager Hello World module requires only a `module.py` file with a class that inherits from `MgrModule`. Commands are declared in the `COMMANDS` list and handled by `handle_command`. This minimal structure is the foundation for all custom manager modules, from simple CLI tools to background monitoring daemons.
