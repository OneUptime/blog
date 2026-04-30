# How to Use IPv6 with Java Netty

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, Netty, Async, Networking, NIO

Description: Build high-performance IPv6 servers and clients with Netty including TCP, HTTP, and dual-stack configurations.

## Basic IPv6 TCP Server with Netty

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.netty</groupId>
    <artifactId>netty-all</artifactId>
    <version>4.1.107.Final</version>
</dependency>
```

```java
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.handler.codec.LineBasedFrameDecoder;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.string.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class IPv6NettyServer {

    public static void main(String[] args) throws Exception {
        EventLoopGroup bossGroup = new NioEventLoopGroup(1);
        EventLoopGroup workerGroup = new NioEventLoopGroup();

        try {
            ServerBootstrap bootstrap = new ServerBootstrap()
                .group(bossGroup, workerGroup)
                .channel(NioServerSocketChannel.class)
                .option(ChannelOption.SO_BACKLOG, 128)
                .childHandler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel ch) {
                        ch.pipeline().addLast(
                            new LineBasedFrameDecoder(8192),
                            new StringDecoder(StandardCharsets.UTF_8),
                            new StringEncoder(StandardCharsets.UTF_8),
                            new IPv6EchoHandler()
                        );
                    }
                });

            // Bind to [::]:8080 to listen on the IPv6 wildcard address
            ChannelFuture f = bootstrap.bind(new InetSocketAddress("::", 8080)).sync();
            System.out.println("IPv6 Netty server on " + f.channel().localAddress());
            f.channel().closeFuture().sync();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }
}

class IPv6EchoHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void channelActive(ChannelHandlerContext ctx) {
        InetSocketAddress addr = (InetSocketAddress) ctx.channel().remoteAddress();
        System.out.println("Connected: " + addr.getAddress().getHostAddress());
    }

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        System.out.println("Received: " + msg);
        ctx.writeAndFlush("Echo: " + msg + "\n");
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        cause.printStackTrace();
        ctx.close();
    }
}
```

## IPv6 TCP Client with Netty

```java
import io.netty.bootstrap.Bootstrap;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.handler.codec.LineBasedFrameDecoder;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioSocketChannel;
import io.netty.handler.codec.string.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class IPv6NettyClient {

    public static void main(String[] args) throws Exception {
        EventLoopGroup group = new NioEventLoopGroup();

        try {
            Bootstrap bootstrap = new Bootstrap()
                .group(group)
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel ch) {
                        ch.pipeline().addLast(
                            new LineBasedFrameDecoder(8192),
                            new StringDecoder(StandardCharsets.UTF_8),
                            new StringEncoder(StandardCharsets.UTF_8),
                            new SimpleChannelInboundHandler<String>() {
                                @Override
                                protected void channelRead0(ChannelHandlerContext ctx, String msg) {
                                    System.out.println("Server: " + msg);
                                    ctx.close();
                                }
                            }
                        );
                    }
                });

            // Connect to the local IPv6 server
            ChannelFuture f = bootstrap.connect(
                new InetSocketAddress("::1", 8080)).sync();

            Channel channel = f.channel();
            channel.writeAndFlush("Hello IPv6 Netty!\n");
            channel.closeFuture().sync();
        } finally {
            group.shutdownGracefully();
        }
    }
}
```

## Extracting IPv6 Client Address in Handler

```java
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.util.ReferenceCountUtil;
import java.net.Inet6Address;
import java.net.InetSocketAddress;

public class IPv6AwareHandler extends SimpleChannelInboundHandler<Object> {

    @Override
    public void channelActive(ChannelHandlerContext ctx) {
        InetSocketAddress remote = (InetSocketAddress) ctx.channel().remoteAddress();
        String clientIP = remote.getAddress().getHostAddress();

        boolean isIPv6 = remote.getAddress() instanceof Inet6Address;
        System.out.printf("Client connected: %s (IPv%s)%n",
            clientIP, isIPv6 ? "6" : "4");
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, Object msg) {
        // Process message
        ctx.writeAndFlush(ReferenceCountUtil.retain(msg));
    }
}
```

## IPv6 HTTP Server with Netty

```java
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.http.*;
import io.netty.buffer.Unpooled;
import java.net.InetSocketAddress;

public class IPv6HTTPServer {

    public static void main(String[] args) throws Exception {
        EventLoopGroup boss = new NioEventLoopGroup(1);
        EventLoopGroup worker = new NioEventLoopGroup();

        try {
            ChannelFuture f = new ServerBootstrap()
                .group(boss, worker)
                .channel(NioServerSocketChannel.class)
                .childHandler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel ch) {
                        ch.pipeline().addLast(
                            new HttpServerCodec(),
                            new HttpObjectAggregator(65536),
                            new SimpleChannelInboundHandler<FullHttpRequest>() {
                                @Override
                                protected void channelRead0(ChannelHandlerContext ctx,
                                                            FullHttpRequest req) {
                                    InetSocketAddress remote = (InetSocketAddress)
                                        ctx.channel().remoteAddress();
                                    String body = "Hello from " + remote.getAddress().getHostAddress();

                                    FullHttpResponse resp = new DefaultFullHttpResponse(
                                        HttpVersion.HTTP_1_1,
                                        HttpResponseStatus.OK,
                                        Unpooled.wrappedBuffer(body.getBytes())
                                    );
                                    resp.headers()
                                        .set(HttpHeaderNames.CONTENT_TYPE, "text/plain")
                                        .setInt(HttpHeaderNames.CONTENT_LENGTH,
                                            resp.content().readableBytes());

                                    ctx.writeAndFlush(resp);
                                }
                            }
                        );
                    }
                })
                .bind(new InetSocketAddress("::", 8080)).sync();

            f.channel().closeFuture().sync();
        } finally {
            boss.shutdownGracefully();
            worker.shutdownGracefully();
        }
    }
}
```

## Conclusion

Netty supports IPv6 by passing an IPv6 `InetSocketAddress` to `bind()` or `connect()`. Binding `InetSocketAddress("::", port)` listens on the IPv6 wildcard address, while `connect()` should use a specific remote IPv6 address such as `::1`. The channel's `remoteAddress()` returns an `InetSocketAddress` whose `getAddress()` may be an `Inet6Address` for IPv6 clients. When Java uses IPv6 sockets by default (`java.net.preferIPv4Stack=false`), a socket bound to `::` can accept both IPv6 and IPv4 connections. For high-throughput IPv6 services, Netty's non-blocking I/O model is more scalable than thread-per-connection approaches.
