# How to Run SQLite in Docker (When and How)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, SQLite, Databases, DevOps, Lightweight, Containers

Description: When and how to use SQLite inside Docker containers, including practical patterns for embedded database workloads

---

SQLite is the most widely deployed database in the world. It runs as a library inside your application, stores everything in a single file, and requires zero configuration. But running SQLite in Docker raises some interesting questions. Since SQLite is not a server, what does "running it in Docker" actually mean? This guide covers when it makes sense, the right patterns, and the pitfalls to avoid.

## When SQLite in Docker Makes Sense

SQLite works great inside Docker for these use cases:

**Single-container applications.** If your app runs in one container and needs a lightweight persistent store, SQLite avoids the overhead of a separate database container. Think small APIs, command-line tools, personal projects, or configuration stores.

**Testing and CI/CD.** Running tests against SQLite is fast because it lives in memory or on disk with no network round-trips. Many web frameworks support SQLite as a test backend.

**Edge computing.** Containers deployed on edge devices often cannot rely on network databases. SQLite gives you a full SQL engine with no external dependencies.

**Data processing pipelines.** DuckDB handles analytics, but for transactional workloads in processing pipelines, SQLite is rock solid and fast.

When does it NOT make sense? If multiple containers need to access the same database simultaneously, SQLite is the wrong choice. It supports concurrent reads but only one writer at a time, and file locking across Docker volumes can be unreliable. Use PostgreSQL or MySQL for multi-container workloads.

## Basic Dockerfile with SQLite

Build a Python application that uses SQLite.

```dockerfile
# Dockerfile
FROM python:3.12-slim

# SQLite is already included in Python's standard library
# Install any additional dependencies
RUN pip install --no-cache-dir flask

WORKDIR /app

# Copy application code
COPY app.py /app/

# Create a directory for the database file
RUN mkdir -p /data

# Expose the API port
EXPOSE 5000

CMD ["python", "app.py"]
```

Here is the application.

```python
# app.py - Simple API backed by SQLite
import sqlite3
import json
from flask import Flask, request, jsonify

app = Flask(__name__)
DB_PATH = "/data/app.db"

def get_db():
    """Create a database connection with WAL mode enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # WAL mode allows concurrent reads while writing
    conn.execute("PRAGMA journal_mode=WAL")
    # Enable foreign key enforcement
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    """Create tables if they do not exist."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

@app.route("/notes", methods=["GET"])
def list_notes():
    conn = get_db()
    notes = conn.execute("SELECT * FROM notes ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(n) for n in notes])

@app.route("/notes", methods=["POST"])
def create_note():
    data = request.json
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO notes (title, content) VALUES (?, ?)",
        (data["title"], data.get("content", ""))
    )
    conn.commit()
    note_id = cursor.lastrowid
    conn.close()
    return jsonify({"id": note_id}), 201

@app.route("/notes/<int:note_id>", methods=["GET"])
def get_note(note_id):
    conn = get_db()
    note = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    conn.close()
    if note is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(dict(note))

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000)
```

## Docker Compose Setup

Mount a volume to persist the database file.

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build: .
    container_name: sqlite-app
    ports:
      - "5000:5000"
    volumes:
      # Mount a named volume for database persistence
      - sqlite_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:5000/notes')"]
      interval: 15s
      timeout: 5s
      retries: 3

volumes:
  sqlite_data:
    driver: local
```

```bash
# Build and start
docker compose up -d --build

# Test the API
curl -X POST http://localhost:5000/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "First note", "content": "Hello from Docker + SQLite"}'

curl http://localhost:5000/notes
```

## SQLite PRAGMA Settings for Docker

SQLite has many tunable settings through PRAGMA statements. These are particularly important in containerized environments.

```python
# Recommended PRAGMA settings for Docker
def configure_connection(conn):
    # WAL mode: better concurrency (concurrent reads during writes)
    conn.execute("PRAGMA journal_mode=WAL")

    # Synchronous NORMAL: good balance of safety and speed
    # Use FULL only if you need maximum durability guarantees
    conn.execute("PRAGMA synchronous=NORMAL")

    # Increase cache size (negative value = KB, positive = pages)
    conn.execute("PRAGMA cache_size=-64000")  # 64MB cache

    # Enable memory-mapped I/O for faster reads
    conn.execute("PRAGMA mmap_size=268435456")  # 256MB

    # Busy timeout: wait up to 5 seconds if the database is locked
    conn.execute("PRAGMA busy_timeout=5000")

    # Enable foreign keys (off by default in SQLite)
    conn.execute("PRAGMA foreign_keys=ON")
```

## In-Memory SQLite for Testing

For unit tests, use an in-memory database that runs entirely in RAM.

```python
# test_app.py
import sqlite3
import unittest

class TestDatabase(unittest.TestCase):
    def setUp(self):
        # Create an in-memory database for each test
        self.conn = sqlite3.connect(":memory:")
        self.conn.execute("""
            CREATE TABLE notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT
            )
        """)

    def test_insert_and_retrieve(self):
        self.conn.execute(
            "INSERT INTO notes (title, content) VALUES (?, ?)",
            ("Test", "Content")
        )
        self.conn.commit()
        row = self.conn.execute("SELECT * FROM notes WHERE id = 1").fetchone()
        self.assertEqual(row[1], "Test")

    def tearDown(self):
        self.conn.close()
```

Run tests in Docker.

```bash
# Run tests inside the container
docker run --rm sqlite-app python -m pytest test_app.py -v
```

## Backup Strategies

SQLite databases are single files, which makes backups simple but requires care with active connections.

```bash
# Method 1: Use SQLite's built-in backup API (safe for active databases)
docker exec sqlite-app python -c "
import sqlite3
source = sqlite3.connect('/data/app.db')
backup = sqlite3.connect('/data/backup.db')
source.backup(backup)
backup.close()
source.close()
print('Backup complete')
"

# Method 2: Copy the file (only safe if no writes are happening)
docker cp sqlite-app:/data/app.db ./app_backup.db

# Method 3: Use sqlite3 CLI .dump command for SQL export
docker exec sqlite-app python -c "
import sqlite3
conn = sqlite3.connect('/data/app.db')
with open('/data/dump.sql', 'w') as f:
    for line in conn.iterdump():
        f.write(line + '\n')
conn.close()
"
```

## Volume Considerations

SQLite relies on file locking for concurrency control. This has implications for Docker volumes.

**Named volumes** work reliably because they use the host filesystem directly.

**Bind mounts** also work but be careful with networked filesystems (NFS, CIFS). SQLite file locking may not work correctly on network mounts.

**tmpfs mounts** give you maximum speed but data disappears when the container stops. Good for caching or temporary processing.

```yaml
# Different volume strategies
services:
  # Persistent storage with named volume
  app-persistent:
    volumes:
      - sqlite_data:/data

  # High-speed ephemeral storage
  app-tmpfs:
    tmpfs:
      - /data:size=512M

  # Bind mount for easy access from the host
  app-bind:
    volumes:
      - ./local_data:/data
```

## Multi-Stage Build for CLI Tools

Build a lightweight container with SQLite CLI tools for database inspection.

```dockerfile
# Dockerfile.tools
FROM alpine:3.19

# Install SQLite CLI
RUN apk add --no-cache sqlite

WORKDIR /data

ENTRYPOINT ["sqlite3"]
```

```bash
# Build and use the tools container
docker build -f Dockerfile.tools -t sqlite-tools .

# Open an interactive SQLite session on your database
docker run -it --rm -v sqlite_data:/data sqlite-tools /data/app.db

# Run a one-off query
docker run --rm -v sqlite_data:/data sqlite-tools /data/app.db ".tables"
docker run --rm -v sqlite_data:/data sqlite-tools /data/app.db "SELECT COUNT(*) FROM notes;"
```

## Database Size and Performance

Monitor your SQLite database health.

```bash
# Check database file size
docker exec sqlite-app ls -lh /data/app.db

# Run integrity check
docker exec sqlite-app python -c "
import sqlite3
conn = sqlite3.connect('/data/app.db')
result = conn.execute('PRAGMA integrity_check').fetchone()
print(f'Integrity: {result[0]}')
result = conn.execute('PRAGMA page_count').fetchone()
page_size = conn.execute('PRAGMA page_size').fetchone()[0]
print(f'Database size: {result[0] * page_size / 1024 / 1024:.2f} MB')
conn.close()
"
```

## Summary

SQLite in Docker works best for single-container applications, testing, edge deployments, and data pipelines. Store the database file on a named volume, enable WAL mode for better concurrency, and use the built-in backup API for safe backups. Avoid sharing SQLite files across containers or over networked filesystems. For in-memory test databases, use `:memory:` for speed. The combination of Docker's isolation and SQLite's simplicity creates a lightweight, portable data layer that handles many workloads without the overhead of a separate database server.
