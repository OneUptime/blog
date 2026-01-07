# How to Handle File I/O Efficiently in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, File I/O, Performance, Async, tokio, Memory-Mapped Files, Buffered I/O

Description: Learn how to handle file I/O efficiently in Rust. This guide covers buffered I/O, memory-mapped files, async file operations, and patterns for processing large files without exhausting memory.

---

> File I/O performance can make or break data-intensive applications. Reading a file byte-by-byte is orders of magnitude slower than proper buffered I/O. This guide shows you how to handle files efficiently in Rust.

Understanding when to use buffered I/O, memory mapping, or async operations is key to building fast file-processing applications.

---

## Buffered vs Unbuffered I/O

```rust
// Comparison of I/O approaches
use std::fs::File;
use std::io::{BufReader, BufWriter, Read, Write};

// BAD: Unbuffered - many syscalls
fn read_unbuffered(path: &str) -> std::io::Result<Vec<u8>> {
    let mut file = File::open(path)?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)?; // Still reads all at once
    Ok(buffer)
}

// GOOD: Buffered - fewer syscalls
fn read_buffered(path: &str) -> std::io::Result<Vec<u8>> {
    let file = File::open(path)?;
    let mut reader = BufReader::new(file);
    let mut buffer = Vec::new();
    reader.read_to_end(&mut buffer)?;
    Ok(buffer)
}

// BEST: Buffered with capacity hint
fn read_buffered_with_hint(path: &str) -> std::io::Result<Vec<u8>> {
    let file = File::open(path)?;
    let metadata = file.metadata()?;
    let size = metadata.len() as usize;

    let mut reader = BufReader::with_capacity(64 * 1024, file); // 64KB buffer
    let mut buffer = Vec::with_capacity(size); // Pre-allocate
    reader.read_to_end(&mut buffer)?;
    Ok(buffer)
}
```

---

## Line-by-Line Processing

For text files, process line by line to avoid loading everything into memory.

```rust
// src/line_processing.rs
// Efficient line-by-line file processing

use std::fs::File;
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::Path;

/// Process file line by line (streaming)
pub fn process_lines<F>(input: &Path, output: &Path, transform: F) -> std::io::Result<usize>
where
    F: Fn(&str) -> String,
{
    let input_file = File::open(input)?;
    let output_file = File::create(output)?;

    let reader = BufReader::new(input_file);
    let mut writer = BufWriter::new(output_file);

    let mut count = 0;

    for line in reader.lines() {
        let line = line?;
        let transformed = transform(&line);
        writeln!(writer, "{}", transformed)?;
        count += 1;
    }

    writer.flush()?;
    Ok(count)
}

/// Count lines without loading file into memory
pub fn count_lines(path: &Path) -> std::io::Result<usize> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    Ok(reader.lines().count())
}

/// Search for pattern in file
pub fn grep(path: &Path, pattern: &str) -> std::io::Result<Vec<(usize, String)>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);

    let matches: Vec<_> = reader
        .lines()
        .enumerate()
        .filter_map(|(idx, line)| {
            line.ok().and_then(|l| {
                if l.contains(pattern) {
                    Some((idx + 1, l))
                } else {
                    None
                }
            })
        })
        .collect();

    Ok(matches)
}
```

---

## Chunked Reading for Large Files

Process files in chunks when line-by-line isn't appropriate.

```rust
// src/chunked.rs
// Chunked file processing

use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

const CHUNK_SIZE: usize = 64 * 1024; // 64KB chunks

/// Process file in chunks
pub fn process_chunks<F>(path: &Path, mut processor: F) -> std::io::Result<()>
where
    F: FnMut(&[u8]) -> std::io::Result<()>,
{
    let file = File::open(path)?;
    let mut reader = BufReader::with_capacity(CHUNK_SIZE, file);
    let mut buffer = vec![0u8; CHUNK_SIZE];

    loop {
        let bytes_read = reader.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        processor(&buffer[..bytes_read])?;
    }

    Ok(())
}

/// Calculate file checksum without loading into memory
pub fn calculate_checksum(path: &Path) -> std::io::Result<u64> {
    use std::hash::Hasher;

    let mut hasher = std::collections::hash_map::DefaultHasher::new();

    process_chunks(path, |chunk| {
        hasher.write(chunk);
        Ok(())
    })?;

    Ok(hasher.finish())
}

/// Parallel chunk processing
pub fn process_chunks_parallel<F, R>(path: &Path, processor: F) -> std::io::Result<Vec<R>>
where
    F: Fn(&[u8]) -> R + Send + Sync,
    R: Send,
{
    use rayon::prelude::*;

    // Read entire file (for small enough files)
    let data = std::fs::read(path)?;

    let results: Vec<R> = data
        .par_chunks(CHUNK_SIZE)
        .map(|chunk| processor(chunk))
        .collect();

    Ok(results)
}
```

---

## Memory-Mapped Files

For random access or very large files, memory mapping is often the fastest approach.

```rust
// src/mmap.rs
// Memory-mapped file I/O

use memmap2::{Mmap, MmapMut, MmapOptions};
use std::fs::{File, OpenOptions};
use std::path::Path;

/// Read-only memory-mapped file
pub fn read_mmap(path: &Path) -> std::io::Result<Mmap> {
    let file = File::open(path)?;
    // SAFETY: File must not be modified while mapped
    unsafe { MmapOptions::new().map(&file) }
}

/// Search in memory-mapped file
pub fn search_mmap(path: &Path, pattern: &[u8]) -> std::io::Result<Vec<usize>> {
    let mmap = read_mmap(path)?;
    let data: &[u8] = &mmap;

    let mut positions = Vec::new();
    let mut start = 0;

    while start + pattern.len() <= data.len() {
        if let Some(pos) = data[start..].windows(pattern.len()).position(|w| w == pattern) {
            positions.push(start + pos);
            start += pos + 1;
        } else {
            break;
        }
    }

    Ok(positions)
}

/// Mutable memory-mapped file
pub fn modify_mmap(path: &Path, offset: usize, data: &[u8]) -> std::io::Result<()> {
    let file = OpenOptions::new().read(true).write(true).open(path)?;

    // SAFETY: Ensure exclusive access to file
    let mut mmap = unsafe { MmapOptions::new().map_mut(&file)? };

    if offset + data.len() > mmap.len() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Write would exceed file bounds",
        ));
    }

    mmap[offset..offset + data.len()].copy_from_slice(data);
    mmap.flush()?;

    Ok(())
}

/// Parallel search with memory mapping
pub fn parallel_search_mmap(path: &Path, pattern: &[u8]) -> std::io::Result<Vec<usize>> {
    use rayon::prelude::*;

    let mmap = read_mmap(path)?;
    let data: &[u8] = &mmap;

    const CHUNK_SIZE: usize = 1024 * 1024; // 1MB chunks

    let results: Vec<Vec<usize>> = data
        .par_chunks(CHUNK_SIZE)
        .enumerate()
        .map(|(chunk_idx, chunk)| {
            let base_offset = chunk_idx * CHUNK_SIZE;
            let mut positions = Vec::new();

            for (i, window) in chunk.windows(pattern.len()).enumerate() {
                if window == pattern {
                    positions.push(base_offset + i);
                }
            }

            positions
        })
        .collect();

    Ok(results.into_iter().flatten().collect())
}
```

---

## Async File I/O with Tokio

For async applications, use `tokio::fs` for non-blocking file operations.

```rust
// src/async_io.rs
// Async file I/O with tokio

use tokio::fs::{File, OpenOptions};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader, BufWriter};
use std::path::Path;

/// Async read entire file
pub async fn read_file_async(path: &Path) -> std::io::Result<Vec<u8>> {
    tokio::fs::read(path).await
}

/// Async read file as string
pub async fn read_string_async(path: &Path) -> std::io::Result<String> {
    tokio::fs::read_to_string(path).await
}

/// Async line-by-line processing
pub async fn process_lines_async<F, Fut>(path: &Path, mut processor: F) -> std::io::Result<usize>
where
    F: FnMut(String) -> Fut,
    Fut: std::future::Future<Output = std::io::Result<()>>,
{
    let file = File::open(path).await?;
    let reader = BufReader::new(file);
    let mut lines = reader.lines();

    let mut count = 0;
    while let Some(line) = lines.next_line().await? {
        processor(line).await?;
        count += 1;
    }

    Ok(count)
}

/// Async write with buffering
pub async fn write_lines_async(path: &Path, lines: &[String]) -> std::io::Result<()> {
    let file = File::create(path).await?;
    let mut writer = BufWriter::new(file);

    for line in lines {
        writer.write_all(line.as_bytes()).await?;
        writer.write_all(b"\n").await?;
    }

    writer.flush().await?;
    Ok(())
}

/// Copy file asynchronously
pub async fn copy_file_async(src: &Path, dst: &Path) -> std::io::Result<u64> {
    tokio::fs::copy(src, dst).await
}

/// Async file append
pub async fn append_async(path: &Path, data: &[u8]) -> std::io::Result<()> {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .await?;

    file.write_all(data).await?;
    file.flush().await?;

    Ok(())
}
```

---

## Temporary Files

Handle temporary files safely with automatic cleanup.

```rust
// src/temp_files.rs
// Temporary file handling

use std::fs::File;
use std::io::{Read, Write};
use tempfile::{NamedTempFile, TempDir};

/// Create temp file with data
pub fn create_temp_with_data(data: &[u8]) -> std::io::Result<NamedTempFile> {
    let mut temp = NamedTempFile::new()?;
    temp.write_all(data)?;
    temp.flush()?;
    Ok(temp)
}

/// Process with temp file
pub fn process_with_temp<F, R>(input_data: &[u8], processor: F) -> std::io::Result<R>
where
    F: FnOnce(&std::path::Path) -> std::io::Result<R>,
{
    let temp = create_temp_with_data(input_data)?;
    processor(temp.path())
    // temp file automatically deleted when dropped
}

/// Create temp directory for multiple files
pub fn process_in_temp_dir<F, R>(processor: F) -> std::io::Result<R>
where
    F: FnOnce(&std::path::Path) -> std::io::Result<R>,
{
    let temp_dir = TempDir::new()?;
    processor(temp_dir.path())
    // entire directory deleted when dropped
}
```

---

## File Locking

Prevent concurrent access issues with file locking.

```rust
// src/file_lock.rs
// File locking for concurrent access

use fs2::FileExt;
use std::fs::{File, OpenOptions};
use std::path::Path;

/// Exclusive lock for writing
pub fn write_with_lock(path: &Path, data: &[u8]) -> std::io::Result<()> {
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(path)?;

    // Acquire exclusive lock (blocks if held by another process)
    file.lock_exclusive()?;

    // Write data
    std::io::Write::write_all(&mut &file, data)?;

    // Lock released when file is dropped
    Ok(())
}

/// Shared lock for reading
pub fn read_with_lock(path: &Path) -> std::io::Result<Vec<u8>> {
    let file = File::open(path)?;

    // Acquire shared lock (multiple readers allowed)
    file.lock_shared()?;

    let mut data = Vec::new();
    std::io::Read::read_to_end(&mut &file, &mut data)?;

    Ok(data)
}

/// Try lock without blocking
pub fn try_write_with_lock(path: &Path, data: &[u8]) -> std::io::Result<bool> {
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(path)?;

    match file.try_lock_exclusive() {
        Ok(()) => {
            std::io::Write::write_all(&mut &file, data)?;
            Ok(true)
        }
        Err(_) => Ok(false), // Lock held by another process
    }
}
```

---

## Best Practices

| Practice | When to Use |
|----------|-------------|
| BufReader/BufWriter | Always for sequential I/O |
| Memory mapping | Random access, very large files |
| Async I/O | In async applications |
| Chunked processing | Files larger than memory |
| File locking | Multi-process access |

---

*Need to monitor file processing jobs? [OneUptime](https://oneuptime.com) provides job monitoring with duration tracking and failure alerts.*

**Related Reading:**
- [How to Build a CLI Tool in Rust](https://oneuptime.com/blog/post/2026-01-07-rust-cli-clap-error-handling/view)
- [How to Use Worker Threads in Rust](https://oneuptime.com/blog/post/2026-01-07-rust-worker-threads-cpu-intensive/view)
