# How to Transfer Files over IPv4 TCP Connections in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, TCP, IPv4, File Transfer, Networking, I/O, BufReader

Description: Implement a file transfer server and client in Rust using TcpListener and TcpStream over IPv4 with buffered I/O and progress tracking.

## Introduction

Rust's ownership model and zero-cost abstractions make it excellent for high-performance file transfer. This implementation uses `TcpListener` for the server, `TcpStream` for the client, and `BufReader`/`BufWriter` for efficient buffered I/O.

## File Transfer Server

```rust
// src/bin/server.rs
use std::net::{TcpListener, TcpStream};
use std::io::{self, BufReader, BufWriter, Read, Write};
use std::fs::{File, create_dir_all};
use std::path::{Path, PathBuf};
use std::thread;

fn receive_file(stream: TcpStream, save_dir: &Path) -> io::Result<()> {
    let peer = stream.peer_addr()?;
    println!("Receiving from {}", peer);
    
    let mut reader = BufReader::new(&stream);
    
    // Read filename length (4 bytes, big-endian)
    let mut len_buf = [0u8; 4];
    reader.read_exact(&mut len_buf)?;
    let name_len = u32::from_be_bytes(len_buf) as usize;
    
    // Read filename
    let mut name_buf = vec![0u8; name_len];
    reader.read_exact(&mut name_buf)?;
    let filename = String::from_utf8_lossy(&name_buf).to_string();
    
    // Safety: strip path components to prevent path traversal
    let safe_name = Path::new(&filename)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    
    // Read file size (8 bytes, big-endian)
    let mut size_buf = [0u8; 8];
    reader.read_exact(&mut size_buf)?;
    let file_size = u64::from_be_bytes(size_buf);
    
    println!("  File: {} ({} bytes)", safe_name, file_size);
    
    // Open output file
    let save_path: PathBuf = save_dir.join(&safe_name);
    let file = File::create(&save_path)?;
    let mut writer = BufWriter::new(file);
    
    // Receive file data in chunks
    let mut buffer = vec![0u8; 64 * 1024]; // 64 KB chunks
    let mut bytes_received: u64 = 0;
    
    while bytes_received < file_size {
        let remaining = file_size - bytes_received;
        let to_read = if remaining < buffer.len() as u64 {
            remaining as usize
        } else {
            buffer.len()
        };
        
        let n = reader.read(&mut buffer[..to_read])?;
        if n == 0 {
            return Err(io::Error::new(io::ErrorKind::UnexpectedEof, "Connection closed"));
        }
        
        writer.write_all(&buffer[..n])?;
        bytes_received += n as u64;
        
        let progress = (bytes_received as f64 / file_size as f64) * 100.0;
        print!("\r  Progress: {:.1}%", progress);
        io::stdout().flush().ok();
    }
    
    writer.flush()?;
    println!("\n  Saved: {}", save_path.display());
    
    // Send acknowledgment
    stream.try_clone()?.write_all(b"OK")?;
    
    Ok(())
}

fn main() -> io::Result<()> {
    let save_dir = Path::new("./received");
    create_dir_all(save_dir)?;
    
    let listener = TcpListener::bind("0.0.0.0:4000")?;
    println!("File server listening on port 4000");
    println!("Saving to: {}", save_dir.display());
    
    for stream in listener.incoming() {
        match stream {
            Ok(s) => {
                let dir = save_dir.to_path_buf();
                thread::spawn(move || {
                    if let Err(e) = receive_file(s, &dir) {
                        eprintln!("Transfer error: {}", e);
                    }
                });
            }
            Err(e) => eprintln!("Accept error: {}", e),
        }
    }
    
    Ok(())
}
```

## File Transfer Client

```rust
// src/bin/client.rs
use std::net::TcpStream;
use std::io::{self, BufReader, BufWriter, Read, Write};
use std::fs::File;
use std::path::Path;
use std::env;

fn send_file(server_addr: &str, file_path: &str) -> io::Result<()> {
    let path = Path::new(file_path);
    let filename = path.file_name()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Invalid file path"))?
        .to_string_lossy()
        .to_string();
    
    let metadata = std::fs::metadata(path)?;
    let file_size = metadata.len();
    
    println!("Sending '{}' ({} bytes) to {}", filename, file_size, server_addr);
    
    let stream = TcpStream::connect(server_addr)?;
    stream.set_write_timeout(Some(std::time::Duration::from_secs(30)))?;
    
    let mut writer = BufWriter::new(&stream);
    
    // Send filename length + filename
    let name_bytes = filename.as_bytes();
    writer.write_all(&(name_bytes.len() as u32).to_be_bytes())?;
    writer.write_all(name_bytes)?;
    
    // Send file size
    writer.write_all(&file_size.to_be_bytes())?;
    
    // Stream the file
    let file = File::open(path)?;
    let mut reader = BufReader::new(file);
    let mut buffer = vec![0u8; 64 * 1024];
    let mut bytes_sent: u64 = 0;
    
    loop {
        let n = reader.read(&mut buffer)?;
        if n == 0 { break; }
        
        writer.write_all(&buffer[..n])?;
        bytes_sent += n as u64;
        
        let progress = (bytes_sent as f64 / file_size as f64) * 100.0;
        print!("\rSending: {:.1}%", progress);
        io::stdout().flush().ok();
    }
    
    writer.flush()?;
    println!("\nWaiting for acknowledgment...");
    
    // Read acknowledgment
    let mut ack = [0u8; 2];
    stream.try_clone()?.read_exact(&mut ack)?;
    
    if &ack == b"OK" {
        println!("Transfer confirmed!");
        Ok(())
    } else {
        Err(io::Error::new(io::ErrorKind::Other, "Server returned error"))
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    
    if args.len() != 3 {
        eprintln!("Usage: {} <server:port> <file-path>", args[0]);
        eprintln!("Example: {} 192.168.1.100:4000 ./large-file.zip", args[0]);
        std::process::exit(1);
    }
    
    if let Err(e) = send_file(&args[1], &args[2]) {
        eprintln!("Transfer failed: {}", e);
        std::process::exit(1);
    }
}
```

## Running the Transfer

```bash
# Build both binaries (place code in src/bin/server.rs and src/bin/client.rs)

cargo build --release

# Start server
./target/release/server

# Send a file (from another terminal or host)
./target/release/client 192.168.1.100:4000 /path/to/file.zip
```

## Conclusion

Rust's ownership model prevents buffer overflows and data races in this file transfer implementation. The `BufReader`/`BufWriter` wrappers minimize system call overhead, and the length-prefixed protocol framing handles TCP's stream-oriented nature correctly.
