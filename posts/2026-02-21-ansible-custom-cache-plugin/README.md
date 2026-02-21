# How to Create a Custom Ansible Cache Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Caching, Performance, Python

Description: Build a custom Ansible cache plugin to store facts and data in your preferred backend for better performance and persistence.

---

Ansible cache plugins control where gathered facts and other cached data get stored between playbook runs. The built-in options include memory, JSON files, Redis, and memcached. But when your infrastructure uses a different storage backend, or you need custom cache behavior like encryption or TTL policies, building a custom cache plugin is the way to go.

This guide covers creating a cache plugin from scratch using a SQLite backend as our example. The same patterns apply whether you are writing a cache plugin for DynamoDB, Consul, etcd, or any other storage system.

## How Cache Plugins Work

When Ansible gathers facts about a host, it can cache those facts so subsequent runs skip the gathering phase. The cache plugin handles the read/write operations for this cached data. The plugin must implement a specific interface that Ansible expects, including methods for getting, setting, deleting, and listing cached keys.

Cache plugins extend the `BaseCacheModule` class from `ansible.plugins.cache`. The required methods are:

- `get(key)` - Retrieve a cached value
- `set(key, value)` - Store a value
- `delete(key)` - Remove a cached value
- `keys()` - List all cached keys
- `contains(key)` - Check if a key exists
- `flush()` - Clear all cached data

## Project Structure

Here is how the files are organized:

```
my_project/
  cache_plugins/
    sqlite_cache.py
  ansible.cfg
  inventory/
    hosts
  playbooks/
    gather_facts.yml
```

## Building the SQLite Cache Plugin

Create `cache_plugins/sqlite_cache.py`:

```python
# sqlite_cache.py - Custom cache plugin using SQLite as the backend
from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = """
    name: sqlite_cache
    short_description: SQLite-based cache plugin
    description:
        - Cache plugin that stores Ansible facts in a SQLite database.
    options:
      _uri:
        description: Path to the SQLite database file.
        required: true
        env:
          - name: ANSIBLE_CACHE_PLUGIN_CONNECTION
        ini:
          - key: fact_caching_connection
            section: defaults
      _timeout:
        description: Cache expiration timeout in seconds.
        default: 86400
        type: integer
        env:
          - name: ANSIBLE_CACHE_PLUGIN_TIMEOUT
        ini:
          - key: fact_caching_timeout
            section: defaults
"""

import json
import sqlite3
import time
import os

from ansible.plugins.cache import BaseCacheModule
from ansible.module_utils.common.text.converters import to_text
from ansible.errors import AnsibleError


class CacheModule(BaseCacheModule):
    """SQLite-backed cache plugin for Ansible."""

    def __init__(self, *args, **kwargs):
        super(CacheModule, self).__init__(*args, **kwargs)
        self._timeout = int(self.get_option('_timeout'))
        self._db_path = os.path.expanduser(self.get_option('_uri'))
        self._db_dir = os.path.dirname(self._db_path)

        # Make sure the directory exists
        if self._db_dir and not os.path.exists(self._db_dir):
            os.makedirs(self._db_dir)

        self._initialize_db()

    def _initialize_db(self):
        """Create the cache table if it does not exist."""
        conn = self._get_connection()
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ansible_cache (
                    cache_key TEXT PRIMARY KEY,
                    cache_value TEXT NOT NULL,
                    created_at REAL NOT NULL
                )
            """)
            conn.commit()
        finally:
            conn.close()

    def _get_connection(self):
        """Open a new SQLite connection."""
        return sqlite3.connect(self._db_path)

    def _is_expired(self, created_at):
        """Check if a cache entry has expired."""
        if self._timeout <= 0:
            return False
        return (time.time() - created_at) > self._timeout

    def get(self, key):
        """Retrieve a cached value by key."""
        conn = self._get_connection()
        try:
            cursor = conn.execute(
                "SELECT cache_value, created_at FROM ansible_cache WHERE cache_key = ?",
                (to_text(key),)
            )
            row = cursor.fetchone()
            if row is None:
                raise KeyError(key)

            value, created_at = row
            if self._is_expired(created_at):
                self.delete(key)
                raise KeyError(key)

            return json.loads(value)
        finally:
            conn.close()

    def set(self, key, value):
        """Store a value in the cache."""
        conn = self._get_connection()
        try:
            serialized = json.dumps(value)
            conn.execute(
                """INSERT OR REPLACE INTO ansible_cache
                   (cache_key, cache_value, created_at)
                   VALUES (?, ?, ?)""",
                (to_text(key), serialized, time.time())
            )
            conn.commit()
        finally:
            conn.close()

    def keys(self):
        """Return all non-expired cache keys."""
        conn = self._get_connection()
        try:
            cursor = conn.execute(
                "SELECT cache_key, created_at FROM ansible_cache"
            )
            result = []
            expired_keys = []
            for row in cursor:
                key, created_at = row
                if self._is_expired(created_at):
                    expired_keys.append(key)
                else:
                    result.append(key)

            # Clean up expired entries
            for ek in expired_keys:
                conn.execute(
                    "DELETE FROM ansible_cache WHERE cache_key = ?", (ek,)
                )
            if expired_keys:
                conn.commit()

            return result
        finally:
            conn.close()

    def contains(self, key):
        """Check if a key exists and has not expired."""
        try:
            self.get(key)
            return True
        except KeyError:
            return False

    def delete(self, key):
        """Remove a key from the cache."""
        conn = self._get_connection()
        try:
            conn.execute(
                "DELETE FROM ansible_cache WHERE cache_key = ?",
                (to_text(key),)
            )
            conn.commit()
        finally:
            conn.close()

    def flush(self):
        """Clear all cached data."""
        conn = self._get_connection()
        try:
            conn.execute("DELETE FROM ansible_cache")
            conn.commit()
        finally:
            conn.close()

    def copy(self):
        """Return a shallow copy of all cached data."""
        conn = self._get_connection()
        try:
            cursor = conn.execute(
                "SELECT cache_key, cache_value, created_at FROM ansible_cache"
            )
            result = {}
            for row in cursor:
                key, value, created_at = row
                if not self._is_expired(created_at):
                    result[key] = json.loads(value)
            return result
        finally:
            conn.close()

    def __del__(self):
        """Nothing to clean up since we open/close connections per operation."""
        pass
```

## Configuring Ansible to Use the Plugin

Update your `ansible.cfg` to enable the custom cache plugin:

```ini
# ansible.cfg - Enable SQLite fact caching
[defaults]
# Tell Ansible to use our custom cache plugin
fact_caching = sqlite_cache
fact_caching_connection = /tmp/ansible_cache.db
fact_caching_timeout = 3600

# Make sure Ansible can find the plugin
cache_plugins = ./cache_plugins
```

## Testing the Cache Plugin

Create a simple playbook that gathers facts and verifies caching works:

```yaml
---
# test_cache.yml - Verify that fact caching works
- name: Test fact caching with SQLite backend
  hosts: all
  gather_facts: true

  tasks:
    - name: Display cached facts
      ansible.builtin.debug:
        msg: >
          Hostname: {{ ansible_hostname }},
          OS: {{ ansible_distribution }} {{ ansible_distribution_version }},
          Memory: {{ ansible_memtotal_mb }} MB
```

Run it twice and notice the second run is faster because facts are pulled from the SQLite cache:

```bash
# First run gathers facts and stores them
ansible-playbook -i inventory/hosts playbooks/test_cache.yml

# Second run reads from cache (no SSH fact gathering)
ansible-playbook -i inventory/hosts playbooks/test_cache.yml
```

You can verify the cached data directly:

```bash
# Inspect the SQLite database
sqlite3 /tmp/ansible_cache.db "SELECT cache_key, length(cache_value), datetime(created_at, 'unixepoch') FROM ansible_cache;"
```

## Adding Encryption Support

For environments where cached facts contain sensitive data, you can add encryption. Here is a modified version of the `set` and `get` methods using the `cryptography` library:

```python
# Add to the top of sqlite_cache.py for encrypted caching
from cryptography.fernet import Fernet
import base64
import hashlib

def _get_cipher(self):
    """Create a Fernet cipher from the encryption key."""
    # Derive a key from a passphrase stored in an env variable
    passphrase = os.environ.get('ANSIBLE_CACHE_ENCRYPTION_KEY', '')
    if not passphrase:
        return None
    key = base64.urlsafe_b64encode(
        hashlib.sha256(passphrase.encode()).digest()
    )
    return Fernet(key)

def set(self, key, value):
    """Store an optionally encrypted value."""
    serialized = json.dumps(value)
    cipher = self._get_cipher()
    if cipher:
        serialized = cipher.encrypt(serialized.encode()).decode()
    conn = self._get_connection()
    try:
        conn.execute(
            """INSERT OR REPLACE INTO ansible_cache
               (cache_key, cache_value, created_at)
               VALUES (?, ?, ?)""",
            (to_text(key), serialized, time.time())
        )
        conn.commit()
    finally:
        conn.close()

def get(self, key):
    """Retrieve and optionally decrypt a cached value."""
    conn = self._get_connection()
    try:
        cursor = conn.execute(
            "SELECT cache_value, created_at FROM ansible_cache WHERE cache_key = ?",
            (to_text(key),)
        )
        row = cursor.fetchone()
        if row is None:
            raise KeyError(key)
        value, created_at = row
        if self._is_expired(created_at):
            self.delete(key)
            raise KeyError(key)
        cipher = self._get_cipher()
        if cipher:
            value = cipher.decrypt(value.encode()).decode()
        return json.loads(value)
    finally:
        conn.close()
```

## Common Pitfalls

One issue you might hit is thread safety. SQLite handles concurrent reads well, but concurrent writes from multiple Ansible forks can cause locking issues. The approach of opening and closing connections per operation helps, but for high-concurrency scenarios, consider using WAL mode:

```python
def _get_connection(self):
    """Open a connection with WAL mode for better concurrency."""
    conn = sqlite3.connect(self._db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn
```

Another thing to watch: always serialize your values to JSON before storing them. Ansible facts can contain nested dictionaries, lists, and various Python types. JSON serialization keeps things portable and debuggable.

## Summary

Building a custom cache plugin is straightforward once you understand the interface. Extend `BaseCacheModule`, implement the required methods, and point Ansible at your plugin via `ansible.cfg`. SQLite is a solid choice for local caching because it requires no external services, handles concurrent reads well, and gives you easy debugging via standard SQL tools. The same patterns work for any backend you need.
