# Validation Summary: How to Implement a Simple Chat Server in Node.js Using IPv4 Sockets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js (`net` module)
- TCP / IPv4 sockets
- Telnet, netcat (test clients)

## Sources Consulted
- Node.js `net` module documentation: https://nodejs.org/api/net.html
- `net.createServer`: https://nodejs.org/api/net.html#netcreateserveroptions-connectionlistener
- `net.Socket` events (`data`, `end`, `close`, `error`, `timeout`): https://nodejs.org/api/net.html#class-netsocket
- `socket.setEncoding`, `socket.setNoDelay`, `socket.setTimeout`: https://nodejs.org/api/net.html
- `server.listen([port[, host[, backlog]]][, callback])`: https://nodejs.org/api/net.html#serverlisten
- Verified by syntax-checking the full code with `node --check` and runtime-testing the disconnect path against Node.js v22.

## Issues Found
- **Double broadcast on disconnect.** `handleDisconnect` was registered for both the `'end'` and `'close'` socket events. Per the Node.js docs, `'close'` always fires after `'end'` for a TCP socket, so the original code broadcast `*** <user> has left the chat ***` twice and logged the disconnect twice. I confirmed this with a runtime test (count = 2). Fix: capture `username` into a local, set `username = null` before broadcasting/logging, and use the captured value. This makes the second invocation a no-op due to the existing `if (username)` guard. The error handler also calls `handleDisconnect`, and `'close'` would still follow — the same guard now handles that case too. Runtime test after the fix: count = 1.

## Review Notes
- The `case '/who':` arm declares `const userList` without a block. This is valid JavaScript and works here because no other case declares the same name, but a block (`case '/who': { ... break; }`) would be safer if the post were extended.
- `socket.setEncoding('utf8')` causes the `data` callback to receive strings, so the `buffer += data` line concatenation is safe (no implicit Buffer→string coercion on multi-byte boundaries).
- Telnet sends CRLF; the per-line `trim()` removes the trailing `\r`, so line handling is correct for both telnet and netcat clients.
- `0.0.0.0` correctly binds the IPv4 wildcard, matching the post's IPv4 framing.
- Username validation strips non-alphanumeric/underscore characters before length-checking, so a user typing pure punctuation gets the "at least 2 alphanumeric" error rather than registering an empty name — behavior is consistent with the prompt text.
