# Validation Summary: How to Handle IPv6 Addresses in Ruby Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby
- IPv6
- Ruby `IPAddr`
- Ruby `Socket` (`TCPServer`, `TCPSocket`, `IPSocket`)
- Ruby `Net::HTTP`
- Ruby `URI`
- Ruby `Resolv`
- Rack
- Ruby on Rails / ActionDispatch

## Sources Consulted
- Ruby `IPAddr`: https://docs.ruby-lang.org/en/3.4/IPAddr.html
- Ruby `Socket`: https://docs.ruby-lang.org/en/master/Socket.html
- Ruby `TCPServer`: https://docs.ruby-lang.org/en/master/TCPServer.html
- Ruby `TCPSocket`: https://docs.ruby-lang.org/en/3.4/TCPSocket.html
- Ruby `IPSocket`: https://docs.ruby-lang.org/en/master/IPSocket.html
- Ruby `Net::HTTP`: https://docs.ruby-lang.org/en/master/Net/HTTP.html
- Ruby `URI::Generic`: https://docs.ruby-lang.org/en/master/URI/Generic.html
- Ruby `Resolv::DNS`: https://docs.ruby-lang.org/en/3.4/Resolv/DNS.html
- Rack `Rack::Request`: https://rack.github.io/rack/main/Rack/Request.html
- Rack `Rack::Request::Helpers`: https://rack.github.io/rack/3.1/Rack/Request/Helpers.html
- Rails `ActionDispatch::RemoteIp`: https://api.rubyonrails.org/v7.1.0/classes/ActionDispatch/RemoteIp.html
- RFC 6874: https://www.rfc-editor.org/rfc/rfc6874.html

## Issues Found
- The original IPv6 validation helper stripped zone IDs before parsing. Current Ruby `IPAddr` supports zone identifiers such as `fe80::1%eth0`, so I removed that stripping to match actual `IPAddr` behavior.
- The TCP client example rescued only `SocketError`. Ruby socket connection failures also surface as `Errno::*` subclasses of `SystemCallError`, so I broadened the rescue clause to cover both.
- The Rack/Rails middleware manually trusted the first `X-Forwarded-For` value. Rack and Rails both document proxy-aware client IP handling, so I changed the example to use `request.ip` and normalize IPv4-mapped IPv6 addresses with `IPAddr#native`.
- The URL-formatting helper stripped zone IDs, which breaks valid link-local IPv6 literals. I updated it to preserve the address and encode the zone separator as `%25` for URI use per RFC 6874.
- The middleware and URL helper used bare `rescue`. I narrowed those rescues to the relevant `IPAddr` exceptions while making the technical fixes.

## Review Notes
- `TCPServer.new('::', 8080)` is valid for binding an IPv6 listener. Whether that socket also accepts IPv4 connections through dual-stack behavior depends on OS and socket settings.
- `ipv6.google.com` still returned AAAA records during review on 2026-04-30, so the DNS lookup example is currently usable.
