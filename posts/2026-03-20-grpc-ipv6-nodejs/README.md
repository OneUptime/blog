# How to Configure gRPC Servers with IPv6 in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Node.js, IPv6, API, JavaScript

Description: Configure Node.js gRPC servers and clients using @grpc/grpc-js to listen on and connect to IPv6 addresses.

## Installation

```bash
# Install gRPC for Node.js

npm install @grpc/grpc-js @grpc/proto-loader grpc-health-check

# Verify installation
node -e "const grpc = require('@grpc/grpc-js'); console.log(typeof grpc.Channel === 'function' ? 'OK' : 'ERR')"
```

## Step 1: gRPC Server Listening on IPv6

```javascript
// server.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load proto file
const PROTO_PATH = path.join(__dirname, 'hello.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const helloProto = grpc.loadPackageDefinition(packageDefinition).helloworld;

// Implement the service
function sayHello(call, callback) {
    // Get the client's peer address (IPv6)
    const peer = call.getPeer();
    console.log(`Request from: ${peer}`);

    callback(null, { message: `Hello, ${call.request.name}! (from ${peer})` });
}

function main() {
    const server = new grpc.Server();

    server.addService(helloProto.Greeter.service, { sayHello });

    // Bind to all IPv6 interfaces - use [::]:port format
    // 0.0.0.0:50051 would be IPv4-only on many systems
    const bindAddress = '[::]:50051';

    server.bindAsync(
        bindAddress,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
            if (error) {
                console.error('Failed to bind:', error);
                process.exit(1);
            }
            console.log(`gRPC server bound on port ${port}`);
        }
    );
}

main();
```

## Step 2: gRPC Client Connecting to IPv6

```javascript
// client.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'hello.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const helloProto = grpc.loadPackageDefinition(packageDefinition).helloworld;

// Connect to IPv6 gRPC server - square brackets required
// Replace ::1 with your server's IPv6 address when connecting remotely
const target = '[::1]:50051';

const client = new helloProto.Greeter(
    target,
    grpc.credentials.createInsecure()
);

// Make a gRPC call
client.sayHello({ name: 'World' }, (error, response) => {
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    console.log('Response:', response.message);
    client.close();
});
```

## Step 3: gRPC with TLS over IPv6

```javascript
// server-tls.js
const fs = require('fs');
const grpc = require('@grpc/grpc-js');

// Reuse helloProto and sayHello from Step 1
const server = new grpc.Server();
server.addService(helloProto.Greeter.service, { sayHello });

const credentials = grpc.ServerCredentials.createSsl(
    null,    // Root CAs are only needed when validating client certificates
    [{
        cert_chain: fs.readFileSync('server.crt'),
        private_key: fs.readFileSync('server.key')
    }],
    false  // Don't require client cert (set true for mTLS)
);

server.bindAsync('[::]:443', credentials, (error, port) => {
    if (error) {
        console.error('Failed to bind:', error);
        return;
    }
    console.log(`Secure gRPC server on [::]:${port}`);
});

// client-tls.js - connect to IPv6 with TLS
const clientCreds = grpc.credentials.createSsl(
    fs.readFileSync('ca.crt')
);

const secureClient = new helloProto.Greeter(
    '[2001:db8::1]:443',
    clientCreds
);
```

## Step 4: Using Environment Variables for IPv6 Config

```javascript
// config.js
const GRPC_HOST = process.env.GRPC_HOST || '::';
const GRPC_PORT = process.env.GRPC_PORT || '50051';

// Format the bind address correctly for IPv6
function getBindAddress(host, port) {
    // Detect IPv6 address (contains colon but no brackets)
    if (host.includes(':') && !host.startsWith('[')) {
        return `[${host}]:${port}`;
    }
    return `${host}:${port}`;
}

const bindAddress = getBindAddress(GRPC_HOST, GRPC_PORT);
// '::' → '[::]:50051'
// '2001:db8::1' → '[2001:db8::1]:50051'
// '0.0.0.0' → '0.0.0.0:50051'

module.exports = { bindAddress };
```

## Step 5: Health Check Server

```javascript
// health.js
const { HealthImplementation } = require('grpc-health-check');

// Reuse the server created in Step 1
const healthImpl = new HealthImplementation({
    'helloworld.Greeter': 'SERVING',
    '': 'SERVING'
});

healthImpl.addToServer(server);
```

## Testing

```bash
# Test with grpcurl using the local proto definition
grpcurl -import-path . -proto hello.proto list
grpcurl -plaintext -import-path . -proto hello.proto -d '{"name":"World"}' '[::1]:50051' helloworld.Greeter/SayHello

# Quick Node.js test
node client.js
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Node.js gRPC service over IPv6. TCP monitors on port 50051 ensure the gRPC server is accepting connections, and you can build custom HTTP health endpoints alongside your gRPC service.

## Conclusion

Node.js gRPC with `@grpc/grpc-js` uses `[::]:port` format for IPv6 server binding. Clients connect using `[ipv6addr]:port`. Use `bindAsync` to bind the server; calling `server.start()` is not necessary in current `@grpc/grpc-js` versions. If you test with `grpcurl` without enabling reflection, pass your `.proto` file with `-proto`. Ensure brackets are present around IPv6 addresses in both server bind addresses and client targets.
