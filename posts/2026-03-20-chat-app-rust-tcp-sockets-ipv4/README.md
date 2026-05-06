# How to Build a Chat Application in Rust Using IPv4 TCP Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, TCP, Chat, IPv4, Tokio, Broadcast, Networking

Description: Learn how to build a multi-client chat server in Rust using IPv4 TCP sockets with Tokio for async I/O and broadcast channels for message delivery.

## Chat Server with Tokio Broadcast

```toml
# Cargo.toml

[dependencies]
tokio = { version = "1", features = ["full"] }
```

```rust
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;

const MAX_MESSAGES: usize = 100;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("0.0.0.0:9006").await?;

    // broadcast::channel allows sending one message to all receivers
    let (tx, _rx) = broadcast::channel::<String>(MAX_MESSAGES);

    println!("Chat server on port 9006");

    loop {
        let (stream, addr) = listener.accept().await?;
        let tx = tx.clone();
        let rx = tx.subscribe();   // Each client gets its own receiver

        println!("[+] {} connected", addr);

        tokio::spawn(handle_chat_client(stream, addr.to_string(), tx, rx));
    }
}

async fn handle_chat_client(
    stream: TcpStream,
    addr: String,
    tx: broadcast::Sender<String>,
    mut rx: broadcast::Receiver<String>,
) {
    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);

    // Announce join
    let join_msg = format!("[Server] {} joined the chat\n", addr);
    let _ = tx.send(join_msg);

    // Ask for username
    let _ = writer.write_all(b"Enter username:\n").await;
    let mut username = String::new();
    let _ = reader.read_line(&mut username).await;
    let username = username.trim().to_string();
    let username = if username.is_empty() { addr.clone() } else { username };

    let welcome = format!("[Server] Welcome, {}!\n", username);
    let _ = writer.write_all(welcome.as_bytes()).await;

    // Task 1: Read messages from this client and broadcast them
    let tx_clone = tx.clone();
    let username_clone = username.clone();
    let mut read_task = tokio::spawn(async move {
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) => break,
                Ok(_) => {
                    let msg = format!("[{}] {}", username_clone, line.trim());
                    println!("{}", msg);
                    let _ = tx_clone.send(format!("{}\n", msg));
                }
                Err(_) => break,
            }
        }
    });

    // Task 2: Receive broadcast messages and write to this client
    let mut write_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(msg) => {
                    if writer.write_all(msg.as_bytes()).await.is_err() {
                        break;
                    }
                }
                Err(broadcast::error::RecvError::Lagged(_)) => {
                    eprintln!("Client lagged, some messages dropped");
                }
                Err(_) => break,
            }
        }
    });

    // Wait for either task to finish, then stop the other one
    tokio::select! {
        _ = &mut read_task => write_task.abort(),
        _ = &mut write_task => read_task.abort(),
    }

    let leave_msg = format!("[Server] {} left the chat\n", username);
    let _ = tx.send(leave_msg);
    println!("[-] {} ({}) disconnected", username, addr);
}
```

## Simple Chat Client

```rust
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use std::io::{self, BufRead};

#[tokio::main]
async fn main() -> std::io::Result<()> {
    let stream = TcpStream::connect("127.0.0.1:9006").await?;
    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);

    // Print incoming messages from server
    let print_task = tokio::spawn(async move {
        let mut line = String::new();
        loop {
            line.clear();
            if reader.read_line(&mut line).await.unwrap_or(0) == 0 {
                println!("[Disconnected]");
                break;
            }
            print!("{}", line);
        }
    });

    // Read stdin and send to server
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = line.unwrap();
        if line.trim() == "/quit" {
            break;
        }
        writer.write_all(format!("{}\n", line).as_bytes()).await?;
    }

    print_task.abort();
    Ok(())
}
```

## Conclusion

A Tokio-based chat server uses `broadcast::channel` to distribute messages to all connected clients simultaneously. Each client gets two tasks: one reads from the socket and sends to the channel, the other receives from the channel and writes to the socket. `tokio::select!` waits for either task to complete, and the remaining task is aborted to clean up the connection. This pattern scales to many concurrent chat users on Tokio's async runtime.
