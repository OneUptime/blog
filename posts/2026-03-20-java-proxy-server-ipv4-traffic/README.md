# How to Implement a Proxy Server in Java for IPv4 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Proxy Server, IPv4, TCP, Networking, Security, Intercepting

Description: Build a simple TCP proxy server in Java that forwards IPv4 connections from clients to backend servers, with optional request/response logging.

## Introduction

A TCP proxy server accepts client connections on one address and forwards the traffic to a backend server, acting as an intermediary. This is useful for traffic logging, protocol inspection, load balancing, SSL termination, and access control. This Java implementation demonstrates bidirectional TCP proxying over IPv4.

## Simple TCP Proxy Server

```java
import java.io.*;
import java.net.*;
import java.util.concurrent.*;
import java.util.logging.*;

public class TCPProxy {
    
    private static final Logger logger = Logger.getLogger(TCPProxy.class.getName());
    
    private final int listenPort;
    private final String backendHost;
    private final int backendPort;
    private final ExecutorService executor;
    
    public TCPProxy(int listenPort, String backendHost, int backendPort) {
        this.listenPort = listenPort;
        this.backendHost = backendHost;
        this.backendPort = backendPort;
        this.executor = Executors.newCachedThreadPool();
    }
    
    public void start() throws IOException {
        ServerSocket server = new ServerSocket();
        server.setReuseAddress(true);
        server.bind(new InetSocketAddress("0.0.0.0", listenPort), 100);
        
        logger.info(String.format("Proxy listening on port %d, forwarding to %s:%d",
            listenPort, backendHost, backendPort));
        
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try { server.close(); } catch (IOException ignored) {}
            executor.shutdown();
        }));
        
        while (!server.isClosed()) {
            try {
                Socket clientSocket = server.accept();
                executor.submit(() -> handleConnection(clientSocket));
            } catch (SocketException e) {
                if (!server.isClosed()) logger.warning("Accept error: " + e.getMessage());
            }
        }
    }
    
    private void handleConnection(Socket clientSocket) {
        String clientAddr = clientSocket.getRemoteSocketAddress().toString();
        logger.info("New connection from: " + clientAddr);
        
        try (clientSocket; Socket backendSocket = new Socket()) {
            // Connect to the backend
            backendSocket.connect(new InetSocketAddress(backendHost, backendPort), 5000);
            
            clientSocket.setSoTimeout(300000); // 5-minute timeout
            backendSocket.setSoTimeout(300000);
            
            // Forward traffic in both directions concurrently
            Thread clientToBackend = new Thread(() -> 
                pipe(clientSocket, backendSocket, clientAddr + " -> backend"));
            Thread backendToClient = new Thread(() ->
                pipe(backendSocket, clientSocket, "backend -> " + clientAddr));
            
            clientToBackend.start();
            backendToClient.start();
            
            // Wait for both directions to finish
            clientToBackend.join();
            backendToClient.join();
            
            logger.info("Connection closed: " + clientAddr);
            
        } catch (ConnectException e) {
            logger.warning("Cannot connect to backend " + backendHost + ":" + backendPort);
        } catch (SocketTimeoutException e) {
            logger.info("Timeout for: " + clientAddr);
        } catch (Exception e) {
            logger.warning("Error handling " + clientAddr + ": " + e.getMessage());
        }
    }
    
    /**
     * Forward all bytes from source to destination, logging byte counts.
     */
    private void pipe(Socket from, Socket to, String direction) {
        byte[] buffer = new byte[8192];
        long totalBytes = 0;
        
        try {
            InputStream in = from.getInputStream();
            OutputStream out = to.getOutputStream();
            
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
                out.flush();
                totalBytes += bytesRead;
                
                // Optional: intercept/log data here
                // logData(direction, buffer, bytesRead);
            }

            // Preserve the opposite direction by half-closing only the write side.
            to.shutdownOutput();
            
        } catch (SocketException e) {
            // Connection closed - normal
        } catch (IOException e) {
            logger.fine("Pipe error [" + direction + "]: " + e.getMessage());
        } finally {
            logger.fine(String.format("[%s] transferred %,d bytes", direction, totalBytes));
        }
    }
    
    public static void main(String[] args) throws IOException {
        if (args.length != 3) {
            System.err.println("Usage: TCPProxy <listenPort> <backendHost> <backendPort>");
            System.err.println("Example: TCPProxy 8080 10.0.0.5 80");
            System.exit(1);
        }
        
        int listenPort = Integer.parseInt(args[0]);
        String backendHost = args[1];
        int backendPort = Integer.parseInt(args[2]);
        
        new TCPProxy(listenPort, backendHost, backendPort).start();
    }
}
```

## Adding HTTP Request Logging

Extend the `pipe` method to log basic HTTP traffic:

```java
private void logData(String direction, byte[] data, int length) {
    String text;
    try {
        text = new String(data, 0, length, "UTF-8");
    } catch (Exception e) {
        return;
    }
    
    // Only log some common HTTP request/response lines
    if (text.startsWith("GET ") || text.startsWith("POST ") || 
        text.startsWith("HTTP/") || text.startsWith("PUT ")) {
        String firstLine = text.split("\r\n")[0];
        logger.info("[HTTP] " + direction + ": " + firstLine);
    }
}
```

## Running the Proxy

```bash
# Compile

javac TCPProxy.java

# Start proxy: listen on 8888, forward to backend:80
java TCPProxy 8888 10.0.0.5 80

# Test with curl
curl http://127.0.0.1:8888/api/endpoint
```

## Conclusion

This bidirectional TCP proxy demonstrates Java's socket-level networking. The key pattern is spawning two goroutine-equivalent threads - one for each direction - and using `InputStream.read()` loops to move data. Add TLS termination by accepting client connections with `SSLServerSocket`; use `SSLSocket` when the backend also expects TLS.
