# How to Implement TCP Protocols with Tokio Codec in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Tokio, TCP, Protocol, Networking

Description: A practical guide to implementing custom TCP protocols in Rust using Tokio's codec framework, covering framing strategies, encoder/decoder patterns, and production-ready connection handling.

---

Building network services in Rust often means dealing with raw bytes over TCP. While you could manually parse data from `TcpStream`, this approach gets messy fast - you need to handle partial reads, message boundaries, and buffer management yourself. Tokio's codec framework solves this by providing a clean abstraction for encoding and decoding framed messages.

This guide walks through implementing a custom TCP protocol from scratch. We will build a simple key-value store protocol that handles `GET`, `SET`, and `DELETE` commands.

## Understanding the Codec Pattern

A codec in Tokio consists of two traits: `Decoder` and `Encoder`. The `Decoder` trait transforms incoming bytes into structured messages, while `Encoder` does the reverse. Between them, they handle all the complexity of message framing - determining where one message ends and the next begins.

The simplest framing strategy is length-prefixed messages: every message starts with a fixed-size header indicating its length. Other options include delimiter-based framing (like newline-separated JSON) or fixed-size messages.

## Setting Up the Project

Start with a new Cargo project and add the required dependencies:

```toml
[package]
name = "kv-protocol"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1", features = ["full"] }
tokio-util = { version = "0.7", features = ["codec"] }
bytes = "1"
thiserror = "1"
```

## Defining the Protocol Messages

First, define the messages your protocol will handle:

```rust
use bytes::{Buf, BufMut, Bytes, BytesMut};
use std::io;
use thiserror::Error;

// Commands sent by clients
#[derive(Debug, Clone)]
pub enum Command {
    Get { key: String },
    Set { key: String, value: Bytes },
    Delete { key: String },
}

// Responses sent by the server
#[derive(Debug, Clone)]
pub enum Response {
    Value(Option<Bytes>),  // GET response
    Ok,                     // SET/DELETE success
    Error(String),          // Something went wrong
}

// Protocol-specific errors
#[derive(Error, Debug)]
pub enum ProtocolError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),
    #[error("Invalid message type: {0}")]
    InvalidMessageType(u8),
    #[error("Invalid UTF-8 in key")]
    InvalidUtf8,
    #[error("Message too large: {0} bytes")]
    MessageTooLarge(usize),
}
```

## Implementing the Decoder

The decoder reads bytes from the network and produces structured messages. We use a length-prefixed format where each message starts with a 4-byte length header:

```rust
use tokio_util::codec::Decoder;

const MAX_MESSAGE_SIZE: usize = 16 * 1024 * 1024; // 16 MB limit

pub struct CommandCodec;

impl Decoder for CommandCodec {
    type Item = Command;
    type Error = ProtocolError;

    fn decode(&mut self, src: &mut BytesMut) -> Result<Option<Self::Item>, Self::Error> {
        // Need at least 4 bytes for the length header
        if src.len() < 4 {
            return Ok(None);
        }

        // Read the length without consuming it yet
        let length = u32::from_be_bytes([src[0], src[1], src[2], src[3]]) as usize;

        // Sanity check the message size
        if length > MAX_MESSAGE_SIZE {
            return Err(ProtocolError::MessageTooLarge(length));
        }

        // Check if we have the complete message
        if src.len() < 4 + length {
            // Reserve capacity for the incoming message
            src.reserve(4 + length - src.len());
            return Ok(None);
        }

        // Consume the length header
        src.advance(4);

        // Extract the message bytes
        let data = src.split_to(length);

        // Parse the command
        parse_command(&data)
    }
}

fn parse_command(data: &[u8]) -> Result<Option<Command>, ProtocolError> {
    if data.is_empty() {
        return Ok(None);
    }

    let msg_type = data[0];
    let payload = &data[1..];

    match msg_type {
        // GET: type(1) + key_len(2) + key
        0x01 => {
            if payload.len() < 2 {
                return Ok(None);
            }
            let key_len = u16::from_be_bytes([payload[0], payload[1]]) as usize;
            if payload.len() < 2 + key_len {
                return Ok(None);
            }
            let key = String::from_utf8(payload[2..2 + key_len].to_vec())
                .map_err(|_| ProtocolError::InvalidUtf8)?;
            Ok(Some(Command::Get { key }))
        }
        // SET: type(1) + key_len(2) + key + value_len(4) + value
        0x02 => {
            if payload.len() < 2 {
                return Ok(None);
            }
            let key_len = u16::from_be_bytes([payload[0], payload[1]]) as usize;
            if payload.len() < 2 + key_len + 4 {
                return Ok(None);
            }
            let key = String::from_utf8(payload[2..2 + key_len].to_vec())
                .map_err(|_| ProtocolError::InvalidUtf8)?;

            let value_start = 2 + key_len;
            let value_len = u32::from_be_bytes([
                payload[value_start],
                payload[value_start + 1],
                payload[value_start + 2],
                payload[value_start + 3],
            ]) as usize;

            let value = Bytes::copy_from_slice(
                &payload[value_start + 4..value_start + 4 + value_len]
            );
            Ok(Some(Command::Set { key, value }))
        }
        // DELETE: type(1) + key_len(2) + key
        0x03 => {
            if payload.len() < 2 {
                return Ok(None);
            }
            let key_len = u16::from_be_bytes([payload[0], payload[1]]) as usize;
            let key = String::from_utf8(payload[2..2 + key_len].to_vec())
                .map_err(|_| ProtocolError::InvalidUtf8)?;
            Ok(Some(Command::Delete { key }))
        }
        _ => Err(ProtocolError::InvalidMessageType(msg_type)),
    }
}
```

## Implementing the Encoder

The encoder serializes responses back to bytes:

```rust
use tokio_util::codec::Encoder;

impl Encoder<Response> for CommandCodec {
    type Error = ProtocolError;

    fn encode(&mut self, item: Response, dst: &mut BytesMut) -> Result<(), Self::Error> {
        let mut payload = BytesMut::new();

        match item {
            Response::Value(Some(value)) => {
                payload.put_u8(0x01);  // Response type: value present
                payload.put_u32(value.len() as u32);
                payload.put_slice(&value);
            }
            Response::Value(None) => {
                payload.put_u8(0x02);  // Response type: value absent
            }
            Response::Ok => {
                payload.put_u8(0x03);  // Response type: ok
            }
            Response::Error(msg) => {
                payload.put_u8(0x04);  // Response type: error
                let msg_bytes = msg.as_bytes();
                payload.put_u16(msg_bytes.len() as u16);
                payload.put_slice(msg_bytes);
            }
        }

        // Write length-prefixed message
        dst.put_u32(payload.len() as u32);
        dst.put_slice(&payload);

        Ok(())
    }
}
```

## Building the Server

Now wire everything together into a working server:

```rust
use std::collections::HashMap;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tokio_util::codec::Framed;
use futures::{SinkExt, StreamExt};

type Store = Arc<RwLock<HashMap<String, Bytes>>>;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:9000").await?;
    let store: Store = Arc::new(RwLock::new(HashMap::new()));

    println!("Server listening on 127.0.0.1:9000");

    loop {
        let (socket, addr) = listener.accept().await?;
        let store = Arc::clone(&store);

        tokio::spawn(async move {
            println!("New connection from {}", addr);

            // Wrap the socket with our codec
            let mut framed = Framed::new(socket, CommandCodec);

            while let Some(result) = framed.next().await {
                let response = match result {
                    Ok(cmd) => handle_command(cmd, &store).await,
                    Err(e) => {
                        eprintln!("Protocol error: {}", e);
                        Response::Error(e.to_string())
                    }
                };

                if let Err(e) = framed.send(response).await {
                    eprintln!("Failed to send response: {}", e);
                    break;
                }
            }

            println!("Connection from {} closed", addr);
        });
    }
}

async fn handle_command(cmd: Command, store: &Store) -> Response {
    match cmd {
        Command::Get { key } => {
            let store = store.read().await;
            Response::Value(store.get(&key).cloned())
        }
        Command::Set { key, value } => {
            let mut store = store.write().await;
            store.insert(key, value);
            Response::Ok
        }
        Command::Delete { key } => {
            let mut store = store.write().await;
            store.remove(&key);
            Response::Ok
        }
    }
}
```

## Handling Backpressure

Production servers need to handle slow clients. Tokio's `Framed` type integrates with async streams and sinks, which means you can use bounded channels to apply backpressure:

```rust
use tokio::sync::mpsc;

// In your connection handler, separate reading and writing
let (mut sink, mut stream) = framed.split();
let (tx, mut rx) = mpsc::channel::<Response>(32);

// Writer task - sends responses from the channel
let writer = tokio::spawn(async move {
    while let Some(response) = rx.recv().await {
        if sink.send(response).await.is_err() {
            break;
        }
    }
});

// Reader task - processes commands and sends responses
while let Some(result) = stream.next().await {
    let response = match result {
        Ok(cmd) => handle_command(cmd, &store).await,
        Err(e) => Response::Error(e.to_string()),
    };

    // This will block if the channel is full
    if tx.send(response).await.is_err() {
        break;
    }
}
```

## Testing Your Codec

Always test codecs with edge cases - partial messages, maximum sizes, and malformed input:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_partial_message() {
        let mut codec = CommandCodec;
        let mut buf = BytesMut::new();

        // Only send part of the length header
        buf.put_u8(0x00);
        buf.put_u8(0x00);

        // Should return None, not an error
        assert!(codec.decode(&mut buf).unwrap().is_none());
    }

    #[test]
    fn test_roundtrip() {
        let mut codec = CommandCodec;
        let mut buf = BytesMut::new();

        // Encode a response
        let original = Response::Value(Some(Bytes::from("test-value")));
        codec.encode(original.clone(), &mut buf).unwrap();

        // Verify the length prefix is correct
        let len = u32::from_be_bytes([buf[0], buf[1], buf[2], buf[3]]) as usize;
        assert_eq!(len + 4, buf.len());
    }
}
```

## Performance Considerations

A few tips for high-performance codecs:

1. **Reuse buffers**: The `BytesMut` type is designed for efficient reuse. Avoid allocating new buffers for each message.

2. **Use zero-copy where possible**: The `Bytes` type supports zero-copy slicing. When parsing, use `split_to` instead of copying data.

3. **Batch small writes**: If you are sending many small messages, consider buffering them before flushing to the socket.

4. **Profile your hot paths**: The codec runs on every message. Even small inefficiencies add up at high throughput.

## Wrapping Up

Tokio's codec framework takes the pain out of implementing TCP protocols. By separating framing logic from business logic, you get code that is easier to test, maintain, and reason about. The key-value protocol we built here handles all the tricky parts - partial reads, message boundaries, and async I/O - while keeping the implementation straightforward.

For production use, consider adding timeouts, connection limits, and proper metrics. The `tower` crate provides middleware for these concerns and integrates well with Tokio codecs.
