# How to Build a UDP Multicast Application in Node.js with IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, UDP, Multicast, IPv4, Dgram, Networking

Description: Learn how to build a UDP multicast sender and receiver in Node.js with IPv4, enabling efficient one-to-many communication on local networks.

## Multicast vs Broadcast

Multicast is more efficient than broadcast — only hosts that have joined the multicast group receive the packets. IPv4 multicast addresses range from `224.0.0.0` to `239.255.255.255`.

## Multicast Receiver

```javascript
const dgram = require('dgram');
const os = require('os');

const MULTICAST_ADDR = '224.0.0.100';
const PORT = 9999;
const INTERFACE = '0.0.0.0';  // Listen on all interfaces

const receiver = dgram.createSocket({ type: 'udp4', reuseAddr: true });

receiver.on('message', (msg, rinfo) => {
    try {
        const data = JSON.parse(msg.toString());
        console.log(`Multicast from ${rinfo.address}:${rinfo.port}`);
        console.log(`  Data: ${JSON.stringify(data)}`);
    } catch {
        console.log(`Raw message from ${rinfo.address}: ${msg.toString()}`);
    }
});

receiver.on('error', (err) => {
    console.error(`Receiver error: ${err.message}`);
});

receiver.on('listening', () => {
    const addr = receiver.address();
    console.log(`Listening on ${addr.address}:${addr.port}`);

    // Join the multicast group
    // addMembership(multicastAddr, interfaceAddr)
    receiver.addMembership(MULTICAST_ADDR, INTERFACE);
    console.log(`Joined multicast group: ${MULTICAST_ADDR}`);
});

// Must bind to the multicast port (not the multicast address)
receiver.bind(PORT, INTERFACE);

// Leave group and close on exit
process.on('SIGINT', () => {
    receiver.dropMembership(MULTICAST_ADDR, INTERFACE);
    receiver.close();
    process.exit(0);
});
```

## Multicast Sender

```javascript
const dgram = require('dgram');

const MULTICAST_ADDR = '224.0.0.100';
const PORT = 9999;

const sender = dgram.createSocket('udp4');

sender.bind(() => {
    // Set multicast TTL (1 = local subnet only, 32 = local site, etc.)
    sender.setMulticastTTL(1);

    // Disable loopback so the sender doesn't receive its own packets
    sender.setMulticastLoopback(false);

    let seq = 0;
    const interval = setInterval(() => {
        const payload = JSON.stringify({
            type: 'MULTICAST_MESSAGE',
            seq: ++seq,
            timestamp: new Date().toISOString(),
            data: `Update #${seq}`,
        });

        sender.send(Buffer.from(payload), PORT, MULTICAST_ADDR, (err) => {
            if (err) {
                console.error(`Send error: ${err.message}`);
            } else {
                console.log(`Sent multicast #${seq}`);
            }
        });
    }, 1000);

    // Stop after 10 messages
    setTimeout(() => {
        clearInterval(interval);
        sender.close();
    }, 10000);
});
```

## Specifying the Outgoing Interface

```javascript
const sender = dgram.createSocket('udp4');

sender.bind(() => {
    sender.setMulticastTTL(10);

    // Specify which interface to send multicast on
    sender.setMulticastInterface('192.168.1.50');  // Your interface's IP

    sender.send(Buffer.from('Hello multicast!'), 9999, '224.0.0.100', (err) => {
        if (err) console.error(err);
        sender.close();
    });
});
```

## Multicast Group Management

```javascript
const dgram = require('dgram');

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

socket.bind(9999, () => {
    // Join multiple multicast groups
    const groups = ['224.0.0.100', '224.0.0.101', '224.0.0.102'];
    groups.forEach(g => {
        socket.addMembership(g);
        console.log(`Joined ${g}`);
    });

    socket.on('message', (msg, rinfo) => {
        console.log(`From ${rinfo.address}: ${msg.toString()}`);
    });

    // Leave a specific group
    setTimeout(() => {
        socket.dropMembership('224.0.0.101');
        console.log('Left 224.0.0.101');
    }, 5000);
});
```

## Conclusion

UDP multicast in Node.js requires `dgram.createSocket({ type: 'udp4', reuseAddr: true })`, calling `addMembership(multicastAddr)` after binding, and `setMulticastTTL()` to control reach. Senders call `setMulticastLoopback(false)` to avoid receiving their own packets. Use `dropMembership()` when leaving a group.
