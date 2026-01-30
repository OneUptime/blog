# How to Create Memory-Mapped Files in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Memory, File I/O, Performance

Description: Learn how to use memory-mapped files in Rust with the memmap2 crate for high-performance file operations.

---

Memory-mapped files provide a powerful technique for working with file data by mapping file contents directly into your program's virtual address space. Instead of using traditional read and write system calls, you can access file data as if it were regular memory. This approach can significantly improve performance for certain workloads, especially when dealing with large files or random access patterns.

## What is Memory Mapping?

Memory mapping creates a direct correspondence between a file on disk and a region of memory in your process. When you access this memory region, the operating system automatically handles loading the relevant portions of the file from disk. This eliminates the need for explicit read operations and allows the OS to optimize page loading and caching.

The key benefits of memory mapping include:

- **Zero-copy access**: Data is accessed directly without copying it into application buffers
- **Automatic caching**: The OS manages memory pages efficiently
- **Random access efficiency**: Jumping to different file positions is as fast as pointer arithmetic
- **Simplified code**: File data can be treated as a byte slice

## The memmap2 Crate

Rust provides memory mapping capabilities through the `memmap2` crate, which is a maintained fork of the original `memmap` crate. Add it to your `Cargo.toml`:

```toml
[dependencies]
memmap2 = "0.9"
```

The crate provides two main types: `Mmap` for read-only mappings and `MmapMut` for read-write mappings.

## Reading Files with Mmap

Here's how to create a read-only memory map for reading a large file:

```rust
use memmap2::Mmap;
use std::fs::File;
use std::io::Result;

fn read_file_with_mmap(path: &str) -> Result<()> {
    let file = File::open(path)?;

    // SAFETY: We ensure the file is not modified while mapped
    let mmap = unsafe { Mmap::map(&file)? };

    // Access the file contents as a byte slice
    println!("File size: {} bytes", mmap.len());
    println!("First 100 bytes: {:?}", &mmap[..100.min(mmap.len())]);

    // Search for a pattern
    if let Some(pos) = mmap.windows(5).position(|w| w == b"hello") {
        println!("Found 'hello' at position {}", pos);
    }

    Ok(())
}
```

## Writing Files with MmapMut

For modifying files, use `MmapMut`:

```rust
use memmap2::MmapMut;
use std::fs::OpenOptions;
use std::io::Result;

fn write_with_mmap(path: &str) -> Result<()> {
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .open(path)?;

    // Set the file size
    file.set_len(1024)?;

    // SAFETY: We have exclusive access to the file
    let mut mmap = unsafe { MmapMut::map_mut(&file)? };

    // Write data directly to the mapped memory
    mmap[0..5].copy_from_slice(b"Hello");
    mmap[5..11].copy_from_slice(b" World");

    // Flush changes to disk
    mmap.flush()?;

    Ok(())
}
```

## Random Access Patterns

Memory mapping excels when you need to access different parts of a file non-sequentially. Consider parsing a binary file format with an index:

```rust
use memmap2::Mmap;
use std::fs::File;
use std::io::Result;

struct IndexEntry {
    offset: usize,
    length: usize,
}

fn random_access_example(path: &str, indices: &[IndexEntry]) -> Result<Vec<Vec<u8>>> {
    let file = File::open(path)?;
    let mmap = unsafe { Mmap::map(&file)? };

    // Efficiently access non-contiguous regions
    let results: Vec<Vec<u8>> = indices
        .iter()
        .map(|entry| mmap[entry.offset..entry.offset + entry.length].to_vec())
        .collect();

    Ok(results)
}
```

## Safety Considerations

The `Mmap::map` and `MmapMut::map_mut` functions are marked as `unsafe` because the Rust compiler cannot guarantee memory safety in all scenarios. Here are the key risks to consider:

1. **External modifications**: If another process modifies the file while it's mapped, your program may see inconsistent data or experience undefined behavior.

2. **File truncation**: If the file is truncated while mapped, accessing memory beyond the new file size causes undefined behavior.

3. **Concurrent access**: Multiple mutable mappings to the same file region can lead to data races.

To use memory mapping safely:

```rust
use memmap2::Mmap;
use std::fs::File;
use std::io::Result;
use fs2::FileExt;  // For file locking

fn safe_mmap_read(path: &str) -> Result<()> {
    let file = File::open(path)?;

    // Lock the file to prevent external modifications
    file.lock_shared()?;

    let mmap = unsafe { Mmap::map(&file)? };

    // Work with the mapped data
    process_data(&mmap);

    // Lock is released when file is dropped
    Ok(())
}

fn process_data(data: &[u8]) {
    // Your processing logic here
}
```

## When to Use Memory Mapping

Memory mapping is ideal for:

- **Large files**: Files that exceed available RAM benefit from OS page management
- **Random access**: Databases, search indices, and binary formats with seeks
- **Read-heavy workloads**: When the same data is accessed repeatedly
- **Shared memory**: Multiple processes accessing the same file

However, traditional I/O may be better for:

- **Sequential reads**: Simple streaming where you process data once
- **Small files**: Overhead of mapping setup may exceed benefits
- **Write-heavy workloads**: Frequent small writes with sync requirements

## Conclusion

Memory-mapped files in Rust provide an efficient way to work with file data, especially for large files and random access patterns. The `memmap2` crate offers a straightforward API with `Mmap` for reading and `MmapMut` for writing. While the unsafe blocks require careful consideration of external modifications and concurrent access, following proper safety practices allows you to harness the full performance benefits of memory mapping in your Rust applications.
