# How to Use Python Twisted for IPv6 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, Twisted, Async Networking, TCP Server

Description: Build IPv6-capable asynchronous servers and clients using Python Twisted, including TCP and UDP servers, dual-stack endpoints, and protocol implementations.

## Install Twisted

```bash
pip install twisted
```

## IPv6 TCP Server

```python
from twisted.internet import reactor, protocol
from twisted.internet.endpoints import serverFromString

class IPv6EchoProtocol(protocol.Protocol):
    """Echo server that works over IPv6."""

    def connectionMade(self):
        peer = self.transport.getPeer()
        print(f"Connection from {peer.host}:{peer.port} (IPv{6 if ':' in peer.host else 4})")

    def dataReceived(self, data: bytes):
        # Echo back what we received
        self.transport.write(data)

    def connectionLost(self, reason):
        peer = self.transport.getPeer()
        print(f"Connection closed: {peer.host}")

class IPv6EchoFactory(protocol.ServerFactory):
    protocol = IPv6EchoProtocol

# Listen on IPv6 (:: binds to all IPv6 interfaces)

endpoint = serverFromString(reactor, "tcp6:port=8080:interface=\\:\\:")
d = endpoint.listen(IPv6EchoFactory())

print("IPv6 echo server listening on port 8080")
reactor.run()
```

## IPv6 TCP Client

```python
from twisted.internet import reactor, protocol, defer
from twisted.internet.endpoints import clientFromString

class IPv6ClientProtocol(protocol.Protocol):
    """TCP client that connects over IPv6."""

    def __init__(self, data_to_send: bytes):
        self.data = data_to_send
        self.response = b""

    def connectionMade(self):
        print(f"Connected to {self.transport.getPeer().host}")
        self.transport.write(self.data)

    def dataReceived(self, data: bytes):
        self.response += data
        print(f"Received: {data.decode()!r}")

    def connectionLost(self, reason):
        print("Connection closed")
        reactor.stop()

class IPv6ClientFactory(protocol.ClientFactory):
    def __init__(self, data: bytes):
        self.data = data

    def buildProtocol(self, addr):
        return IPv6ClientProtocol(self.data)

    def clientConnectionFailed(self, connector, reason):
        print(f"Connection failed: {reason.getErrorMessage()}")
        reactor.stop()

# Connect to IPv6 server - use tcp: and escape colons in the literal
endpoint = clientFromString(reactor, "tcp:host=2001\\:db8\\:\\:1:port=8080")
endpoint.connect(IPv6ClientFactory(b"Hello IPv6!"))
reactor.run()
```

## Dual-Stack Server (IPv4 + IPv6)

```python
from twisted.internet import reactor, protocol, defer
from twisted.internet.endpoints import serverFromString

class ChatProtocol(protocol.Protocol):
    """Simple chat server protocol."""

    def connectionMade(self):
        self.factory.clients.add(self)
        peer = self.transport.getPeer()
        print(f"New client: {peer.host}")

    def dataReceived(self, data: bytes):
        # Broadcast to all clients
        for client in self.factory.clients:
            if client is not self:
                client.transport.write(data)

    def connectionLost(self, reason):
        self.factory.clients.discard(self)

class ChatFactory(protocol.ServerFactory):
    protocol = ChatProtocol

    def __init__(self):
        self.clients = set()

factory = ChatFactory()

# Listen on both IPv4 and IPv6 simultaneously
ipv6_endpoint = serverFromString(reactor, "tcp6:port=9000:interface=\\:\\:")
ipv4_endpoint = serverFromString(reactor, "tcp4:port=9000:interface=0.0.0.0")

# Whether both listeners can share the same port depends on the platform's
# IPv6 socket settings. If the IPv6 listener also accepts IPv4-mapped
# connections, the separate IPv4 bind may fail with address already in use.
d1 = ipv6_endpoint.listen(factory)
d2 = ipv4_endpoint.listen(factory)

def started(_):
    print("Dual-stack chat server on port 9000")

def listen_failed(failure):
    print(f"Listen failed: {failure.getErrorMessage()}")
    reactor.stop()

defer.gatherResults([d1, d2]).addCallbacks(started, listen_failed)
reactor.run()
```

## IPv6 UDP Server

```python
from twisted.internet import reactor, protocol

class IPv6UDPProtocol(protocol.DatagramProtocol):
    """UDP server listening on IPv6."""

    def startProtocol(self):
        print(f"UDP server started on {self.transport.getHost()}")

    def datagramReceived(self, data: bytes, addr: tuple):
        host, port = addr[0], addr[1]
        print(f"Received {len(data)} bytes from [{host}]:{port}")
        # Echo back
        self.transport.write(data, addr)

# Bind to all IPv6 interfaces on UDP port 5000
reactor.listenUDP(5000, IPv6UDPProtocol(), interface="::")
print("IPv6 UDP server on port 5000")
reactor.run()
```

## Deferred IPv6 HTTP Client

```python
from twisted.internet import reactor
from twisted.web.client import Agent, readBody
from twisted.web.http_headers import Headers

def fetch_ipv6_page(url: str):
    """Fetch a web page over IPv6 using an IPv6 literal URL."""
    from twisted.web.client import Agent
    from twisted.internet import reactor

    agent = Agent(reactor)
    d = agent.request(
        b"GET",
        url.encode(),
        Headers({"User-Agent": ["Twisted IPv6 Client/1.0"]}),
    )

    def got_response(response):
        print(f"Status: {response.code}")
        print(f"Headers: {list(response.headers.getAllRawHeaders())[:3]}")
        return readBody(response)

    def got_body(body):
        print(f"Body length: {len(body)} bytes")
        reactor.stop()

    def handle_error(failure):
        print(f"Error: {failure.getErrorMessage()}")
        reactor.stop()

    d.addCallback(got_response)
    d.addCallback(got_body)
    d.addErrback(handle_error)

# Note: brackets required for IPv6 literal in URL
fetch_ipv6_page("http://[::1]:8080/")
reactor.run()
```

## Conclusion

Twisted uses endpoint strings to specify IPv6: `tcp6:port=8080:interface=\\:\\:` binds to all IPv6 interfaces, and `tcp:host=2001\\:db8\\:\\:1:port=80` connects to an IPv6 literal (colons must be escaped as `\\:` in endpoint strings). For UDP, pass `interface="::"` to `reactor.listenUDP()`. Binding separate `tcp4` and `tcp6` listeners can provide dual-stack service, but whether both sockets can share the same port depends on the platform's IPv6 socket settings. Twisted's `Agent` accepts absolute HTTP/HTTPS URIs; using an IPv6 literal such as `http://[::1]:8080/` forces an IPv6 connection, while hostname connections use `HostnameEndpoint` and connect to the first resolved address that succeeds. Use Twisted for high-performance, event-driven IPv6 servers where async I/O and protocol composition (TLS, compression, framing) are needed.
