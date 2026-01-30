# How to Build a Simple Database in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Database, Storage, Systems

Description: Learn how to build a simple key-value database in Rust with persistence, indexing, and basic query operations.

---

Building a database from scratch is one of the most rewarding systems programming projects you can undertake. Rust, with its memory safety guarantees and zero-cost abstractions, is an excellent choice for this task. In this post, we'll build a simple key-value database with file-based storage, indexing, and a basic query API.

## Project Setup

First, create a new Rust project and add the necessary dependencies to your `Cargo.toml`:

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
bincode = "1.3"
```

We'll use `serde` for serialization, `serde_json` for human-readable storage, and `bincode` for efficient binary serialization of our write-ahead log.

## Core Data Structures

Let's define our database structure using a `BTreeMap` for indexing, which provides O(log n) lookups and maintains sorted order:

```rust
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs::{File, OpenOptions};
use std::io::{BufReader, BufWriter, Write};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone)]
pub struct Record {
    pub key: String,
    pub value: String,
    pub timestamp: u64,
}

pub struct SimpleDB {
    index: BTreeMap<String, Record>,
    data_path: PathBuf,
    wal_path: PathBuf,
}
```

## Write-Ahead Logging (WAL)

Write-ahead logging ensures durability by writing operations to a log file before applying them to the main data store. This allows recovery after crashes:

```rust
#[derive(Serialize, Deserialize)]
enum WalEntry {
    Insert(Record),
    Delete(String),
}

impl SimpleDB {
    fn append_to_wal(&self, entry: &WalEntry) -> std::io::Result<()> {
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.wal_path)?;

        let mut writer = BufWriter::new(file);
        let encoded = bincode::serialize(entry).unwrap();
        writer.write_all(&(encoded.len() as u32).to_le_bytes())?;
        writer.write_all(&encoded)?;
        writer.flush()
    }
}
```

## Implementing the Database API

Now let's implement the core operations - create, insert, get, delete, and persistence:

```rust
impl SimpleDB {
    pub fn new(data_dir: &str) -> std::io::Result<Self> {
        std::fs::create_dir_all(data_dir)?;

        let mut db = SimpleDB {
            index: BTreeMap::new(),
            data_path: PathBuf::from(data_dir).join("data.json"),
            wal_path: PathBuf::from(data_dir).join("wal.bin"),
        };

        db.recover()?;
        Ok(db)
    }

    pub fn insert(&mut self, key: String, value: String) -> std::io::Result<()> {
        let record = Record {
            key: key.clone(),
            value,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        self.append_to_wal(&WalEntry::Insert(record.clone()))?;
        self.index.insert(key, record);
        Ok(())
    }

    pub fn get(&self, key: &str) -> Option<&Record> {
        self.index.get(key)
    }

    pub fn delete(&mut self, key: &str) -> std::io::Result<bool> {
        if self.index.contains_key(key) {
            self.append_to_wal(&WalEntry::Delete(key.to_string()))?;
            self.index.remove(key);
            Ok(true)
        } else {
            Ok(false)
        }
    }
}
```

## Simple Query Operations

Let's add range queries and prefix searches, leveraging BTreeMap's ordered nature:

```rust
impl SimpleDB {
    pub fn range(&self, start: &str, end: &str) -> Vec<&Record> {
        self.index
            .range(start.to_string()..end.to_string())
            .map(|(_, v)| v)
            .collect()
    }

    pub fn prefix_search(&self, prefix: &str) -> Vec<&Record> {
        let end = format!("{}~", prefix); // '~' is after alphanumerics in ASCII
        self.range(prefix, &end)
    }

    pub fn all_keys(&self) -> Vec<&String> {
        self.index.keys().collect()
    }
}
```

## Persistence and Recovery

Finally, implement persistence to disk and recovery from the WAL:

```rust
impl SimpleDB {
    pub fn flush(&self) -> std::io::Result<()> {
        let file = File::create(&self.data_path)?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, &self.index)?;

        // Clear WAL after successful flush
        File::create(&self.wal_path)?;
        Ok(())
    }

    fn recover(&mut self) -> std::io::Result<()> {
        // Load main data file
        if self.data_path.exists() {
            let file = File::open(&self.data_path)?;
            let reader = BufReader::new(file);
            self.index = serde_json::from_reader(reader).unwrap_or_default();
        }

        // Replay WAL entries
        if self.wal_path.exists() {
            let data = std::fs::read(&self.wal_path)?;
            let mut cursor = 0;

            while cursor + 4 <= data.len() {
                let len = u32::from_le_bytes(
                    data[cursor..cursor+4].try_into().unwrap()
                ) as usize;
                cursor += 4;

                if cursor + len <= data.len() {
                    if let Ok(entry) = bincode::deserialize(&data[cursor..cursor+len]) {
                        match entry {
                            WalEntry::Insert(r) => { self.index.insert(r.key.clone(), r); }
                            WalEntry::Delete(k) => { self.index.remove(&k); }
                        }
                    }
                    cursor += len;
                }
            }
        }
        Ok(())
    }
}
```

## Usage Example

Here's how to use our simple database:

```rust
fn main() -> std::io::Result<()> {
    let mut db = SimpleDB::new("./my_database")?;

    db.insert("user:1".to_string(), "Alice".to_string())?;
    db.insert("user:2".to_string(), "Bob".to_string())?;
    db.insert("config:theme".to_string(), "dark".to_string())?;

    // Query by key
    if let Some(record) = db.get("user:1") {
        println!("Found: {}", record.value);
    }

    // Prefix search
    for record in db.prefix_search("user:") {
        println!("User: {} = {}", record.key, record.value);
    }

    db.flush()?; // Persist to disk
    Ok(())
}
```

## Conclusion

We've built a functional key-value database with BTreeMap indexing for efficient lookups, serde for serialization, write-ahead logging for durability, and a simple query API. This foundation can be extended with features like compaction, transactions, concurrent access with `RwLock`, or even a TCP server interface. The beauty of Rust is that these additions come with compile-time safety guarantees, making it ideal for building reliable storage systems.
