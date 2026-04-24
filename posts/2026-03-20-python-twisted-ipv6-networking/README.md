# How to Use Python Twisted for IPv6 Networking - Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Twisted, IPv6, Networking, Async, Event-Driven

Description: Use the Twisted networking framework to build IPv6-capable servers and clients with its event-driven architecture.

## Twisted and IPv6

Twisted is a mature Python networking framework with excellent IPv6 support. It provides high-level APIs for building servers and clients while handling the complexity of IPv6 socket configuration.

```bash
pip install twisted
```

## Basic IPv6 TCP Server with Twisted

```python
from twisted.internet import reactor, defer
from twisted.internet.protocol import Factory, Protocol
from twisted.internet.endpoints import serverFromString

class EchoProtocol(Protocol):
    """Simple echo protocol for IPv6 server."""

    def connectionMade(self):
        peer = self.transport.getPeer()
        print(f"Connection from {peer.host}:{peer.port}")

    def dataReceived(self, data: bytes):
        """Echo received data back to client."""
        print(f"Received: {data.decode().strip()}")
        self.transport.write(b"Echo: " + data)

    def connectionLost(self, reason):
        print(f"Connection closed: {reason.getErrorMessage()}")

class EchoFactory(Factory):
    protocol = EchoProtocol

def main():
    # Create server endpoint on all IPv6 interfaces, port 8080
    # tcp6 means IPv6 TCP
    endpoint = serverFromString(reactor, "tcp6:8080")

    d = endpoint.listen(EchoFactory())
    d.addCallback(lambda _: print("IPv6 TCP server started on port 8080"))

    reactor.run()

if __name__ == "__main__":
    main()
```

## IPv6 TCP Client with Twisted

```python
from twisted.internet import reactor, defer
from twisted.internet.protocol import Protocol, Factory
from twisted.internet.endpoints import TCP6ClientEndpoint

class IPv6ClientProtocol(Protocol):
    """IPv6 TCP client protocol."""

    def __init__(self, message: str, on_done):
        self.message = message
        self.on_done = on_done

    def connectionMade(self):
        print(f"Connected to {self.transport.getPeer().host}")
        self.transport.write(self.message.encode())

    def dataReceived(self, data: bytes):
        print(f"Response: {data.decode().strip()}")
        self.transport.loseConnection()

    def connectionLost(self, reason):
        self.on_done.callback(None)

class IPv6ClientFactory(Factory):
    def __init__(self, message: str, on_done):
        self.message = message
        self.on_done = on_done

    def buildProtocol(self, addr):
        return IPv6ClientProtocol(self.message, self.on_done)

def connect_ipv6(host: str, port: int, message: str):
    done = defer.Deferred()

    endpoint = TCP6ClientEndpoint(reactor, host, port)
    d = endpoint.connect(IPv6ClientFactory(message, done))
    d.addErrback(done.errback)

    return done

# Run the client

def run():
    d = connect_ipv6("::1", 8080, "Hello IPv6 Twisted!")
    d.addCallback(lambda _: reactor.stop())
    d.addErrback(lambda err: (print(f"Error: {err}"), reactor.stop()))
    reactor.run()

run()
```

## Dual-Stack Server

Twisted can listen on separate IPv4 and IPv6 endpoints simultaneously:

```python
from twisted.internet import reactor
from twisted.internet.protocol import Factory, Protocol
from twisted.internet.endpoints import serverFromString

class EchoProtocol(Protocol):
    def dataReceived(self, data):
        peer = self.transport.getPeer()
        print(f"[{peer.host}]:{peer.port} - {data.decode().strip()}")
        self.transport.write(data)

class EchoFactory(Factory):
    protocol = EchoProtocol

def start_dual_stack_server(port: int):
    """Start both IPv4 and IPv6 TCP servers on the same port."""
    factory = EchoFactory()

    # Bind explicit loopback addresses so both listeners can coexist on the same port.
    v4_endpoint = serverFromString(reactor, f"tcp:{port}:interface=127.0.0.1")
    v4_endpoint.listen(factory)

    v6_endpoint = serverFromString(reactor, f"tcp6:{port}:interface=\\:\\:1")
    v6_endpoint.listen(factory)

    print(f"Dual-stack echo server on port {port}")

start_dual_stack_server(9000)
reactor.run()
```

## HTTP Server with IPv6 Support

Twisted's built-in HTTP server supports IPv6:

```python
from twisted.internet import reactor
from twisted.web import server, resource
from twisted.internet.endpoints import serverFromString

class IPv6StatusResource(resource.Resource):
    isLeaf = True

    def render_GET(self, request):
        # Get client's IPv6 address
        peer = request.transport.getPeer()
        client_ip = peer.host

        response = f"Your IPv6 address: {client_ip}\n"
        return response.encode()

# Start HTTP server on IPv6
site = server.Site(IPv6StatusResource())
endpoint = serverFromString(reactor, "tcp6:8000")
endpoint.listen(site)

print("HTTP server on IPv6 port 8000")
reactor.run()
```

## Twisted's IPv6 Endpoint Strings

| Endpoint String | Meaning |
|----------------|---------|
| `tcp6:8080` | IPv6 TCP server on all IPv6 interfaces |
| `tcp6:8080:backlog=100` | IPv6 TCP server with a custom listen backlog |
| `tcp6:port=8080:interface=2001\:db8\:\:1` | IPv6 TCP on a specific address |
| `tcp:8080` and `tcp6:8080` | Separate IPv4 and IPv6 listeners |

## Conclusion

Twisted provides first-class IPv6 support through its endpoint system. The `tcp6:` endpoint prefix creates an IPv6 listener, and if you need both IPv4 and IPv6 coverage you can configure separate `tcp:` and `tcp6:` listeners. String-based endpoint specifications make it easy to configure addresses programmatically, and Twisted's stable event loop and extensive protocol library make it a solid choice for production IPv6 network services.
