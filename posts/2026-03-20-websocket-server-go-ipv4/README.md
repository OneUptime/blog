# How to Create a WebSocket Server in Go Listening on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WebSocket, Go, IPv4, Networking, Gorilla/websocket, HTTP

Description: Learn how to create a WebSocket server in Go that listens on a specific IPv4 address using gorilla/websocket, with connection handling, hub-based broadcasting, and graceful shutdown.

## Installation

```bash
go get github.com/gorilla/websocket
```

## Basic WebSocket Server

```go
package main

import (
    "fmt"
    "log"
    "net"
    "net/http"

    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // allow all origins in development
    },
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("upgrade: %v", err)
        return
    }
    defer conn.Close()

    remoteIP := conn.RemoteAddr().String()
    log.Printf("[+] Connected: %s", remoteIP)

    for {
        mt, msg, err := conn.ReadMessage()
        if err != nil {
            log.Printf("[-] %s disconnected: %v", remoteIP, err)
            break
        }
        log.Printf("Message from %s: %s", remoteIP, msg)
        if err := conn.WriteMessage(mt, []byte("Echo: "+string(msg))); err != nil {
            break
        }
    }
}

func main() {
    http.HandleFunc("/ws", wsHandler)

    addr := "0.0.0.0:8765"
    ln, err := net.Listen("tcp4", addr)  // tcp4 = IPv4 only
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("WebSocket server on ws://%s/ws\n", addr)
    log.Fatal(http.Serve(ln, nil))
}
```

## Hub-Based Broadcast Server

```go
package main

import (
    "log"
    "net/http"
    "sync"

    "github.com/gorilla/websocket"
)

type Hub struct {
    mu      sync.RWMutex
    clients map[*websocket.Conn]bool
}

func NewHub() *Hub { return &Hub{clients: make(map[*websocket.Conn]bool)} }

func (h *Hub) Add(c *websocket.Conn)    { h.mu.Lock(); h.clients[c] = true; h.mu.Unlock() }
func (h *Hub) Remove(c *websocket.Conn) { h.mu.Lock(); delete(h.clients, c); h.mu.Unlock() }

func (h *Hub) Broadcast(msg []byte) {
    h.mu.RLock()
    defer h.mu.RUnlock()
    for c := range h.clients {
        c.WriteMessage(websocket.TextMessage, msg)
    }
}

var (
    hub      = NewHub()
    upgrader = websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}
)

func wsHandler(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil { return }
    defer func() { hub.Remove(conn); conn.Close() }()

    hub.Add(conn)
    for {
        _, msg, err := conn.ReadMessage()
        if err != nil { break }
        hub.Broadcast(msg)
    }
}

func main() {
    http.HandleFunc("/ws", wsHandler)
    log.Fatal(http.ListenAndServe("0.0.0.0:8765", nil))
}
```

## Graceful Shutdown

```go
package main

import (
    "context"
    "log"
    "net"
    "net/http"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/ws", wsHandler)

    srv := &http.Server{Handler: mux}
    ln, _ := net.Listen("tcp4", "0.0.0.0:8765")

    go func() {
        log.Println("WebSocket server on ws://0.0.0.0:8765/ws")
        if err := srv.Serve(ln); err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()

    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
    <-ctx.Done()
    stop()

    shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    srv.Shutdown(shutCtx)
    log.Println("Server shut down")
}
```

## Conclusion

In Go, WebSocket servers use `gorilla/websocket`'s `Upgrader` to upgrade an HTTP connection. Bind to a specific IPv4 address using `net.Listen("tcp4", addr)` then pass the listener to `http.Serve`. For multi-client scenarios, implement a Hub with a mutex-protected client map. Use `http.Server.Shutdown` to stop accepting new connections; note that Shutdown does not close or wait for hijacked connections such as WebSockets, so you should separately notify active clients (e.g., close their connections) before or during shutdown. Check `websocket.IsCloseError` to distinguish normal disconnects from network errors.
