# How to Follow a TCP Stream in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, TCP, Networking, HTTP, Packet Analysis, Diagnostic

Description: Use Wireshark's Follow TCP Stream feature to reassemble and view the complete conversation of a TCP connection, including HTTP request/response pairs.

"Follow TCP Stream" reassembles all packets from a single TCP connection into a readable conversation - showing the complete HTTP request, response, or any application-layer exchange. It's the fastest way to understand what an application is actually doing on the network.

## Open Follow TCP Stream

```text
Method 1: Right-click on any packet in a TCP stream
  Right-click → Follow → TCP Stream

Method 2: Menu
  Analyze → Follow → TCP Stream

Method 3: Display filter shortcut
  Apply filter: tcp.stream == 0
  (each unique TCP connection gets a stream number)
```

## Reading the Stream View

```text
Color coding:
  Red   → Client to Server (outbound)
  Blue  → Server to Client (inbound)

The stream window shows:
  - Exact application data exchanged
  - Not headers, not packet boundaries
  - Just the raw protocol conversation

Example HTTP GET:
  [Red]  GET /index.html HTTP/1.1
         Host: example.com
         User-Agent: Mozilla/5.0

  [Blue] HTTP/1.1 200 OK
         Content-Type: text/html
         Content-Length: 1234

         <html>...
```

## Navigate Between Streams

```text
The stream dialog shows: "Stream 0 of 47"
  ← → arrows navigate between TCP streams
  Or: enter stream number directly

Find a specific stream:
  Close the dialog
  Apply display filter: tcp.stream == 5
  Right-click any packet → Follow → TCP Stream
```

## Use for HTTP Debugging

```wireshark
# First, filter to find HTTP streams

http

# Find specific request
http.request.uri contains "/api/login"

# Right-click the packet → Follow → TCP Stream
# See the complete HTTP request and response including headers
```

## Extract Data from a Stream

The stream dialog allows saving content:

```text
In the Follow TCP Stream dialog:

"Save as..." → saves the raw stream data to a file
  (useful for extracting files transferred over HTTP)

Show data as:
  ASCII     → human-readable text (HTTP, SMTP, etc.)
  Hex Dump  → raw bytes
  C Arrays  → C code representation
  Raw       → binary data (for file extraction)
  YAML      → YAML format
```

## Analyze Connection Handshake from Stream View

Close the stream dialog and look at the timeline:

```bash
# Apply filter for a specific TCP stream
tcp.stream == 0

# Sort by time to see:
# [SYN]     → Connection initiation
# [SYN-ACK] → Server accepted
# [ACK]     → Handshake complete
# [PSH,ACK] → Application data flowing
# [FIN,ACK] → Connection closing gracefully
# [RST]     → Abnormal termination (check for errors)
```

## Following Other Protocol Streams

Wireshark can follow streams for other protocols too:

```text
Analyze → Follow → UDP Stream  (for DNS, QUIC)
Analyze → Follow → TLS Stream  (encrypted - shows client/server hello)
Analyze → Follow → HTTP/2 Stream (modern web traffic)
Analyze → Follow → QUIC Stream
```

Following TCP streams transforms raw packet analysis into reading application conversations - essential for debugging API calls, authentication flows, and any plaintext protocol behavior.
