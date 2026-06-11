# Validation Summary: How to Build a Simple Database in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Cargo
- serde
- serde_json
- bincode
- std::collections::BTreeMap
- std::fs and std::io file APIs
- Write-ahead logging

## Sources Consulted
- Rust standard library documentation for `BTreeMap`: https://doc.rust-lang.org/std/collections/struct.BTreeMap.html
- Rust standard library documentation for `Write` and `BufWriter`: https://doc.rust-lang.org/std/io/trait.Write.html and https://doc.rust-lang.org/std/io/struct.BufWriter.html
- Rust standard library documentation for `File::sync_all`: https://doc.rust-lang.org/std/fs/struct.File.html
- serde documentation: https://serde.rs/
- serde_json `to_writer_pretty` documentation: https://docs.rs/serde_json/latest/serde_json/fn.to_writer_pretty.html
- bincode 1.3.3 documentation: https://docs.rs/crate/bincode/1.3.3
- Local verification with `cargo check` using Rust 1.93.0 and the post's dependency versions.

## Issues Found
- The WAL append path only called `BufWriter::flush()`. That flushes buffered bytes to the underlying writer but does not ask the OS to sync the file to disk, which made the durability explanation too strong. I changed the snippet to call `writer.get_ref().sync_all()` after flushing.
- The `flush()` implementation wrote JSON through a `BufWriter` and then truncated the WAL before explicitly flushing and syncing the JSON file. I changed it to write through `&mut writer`, flush the buffer, sync the data file, then truncate and sync the WAL.
- The prefix search used `format!("{}~", prefix)` as an upper bound. That only works for a limited ASCII key set and is not correct for arbitrary Rust `String` keys. I changed it to start from `prefix.to_string()..` and stop once keys no longer start with the prefix.
- WAL recovery did not stop when it encountered a truncated final record. I added a `break` for incomplete trailing entries so recovery does not continue parsing partial WAL bytes as another length prefix.

## Review Notes
- The code examples compile successfully when concatenated into one Rust 2021 binary crate with the dependencies shown in the post.
- `bincode = "1.3"` resolves to 1.3.3 and the `serialize`/`deserialize` APIs used in the post are valid for that pinned major version. A newer major version exists, so future updates could modernize the example, but the current pinned example is technically valid.
