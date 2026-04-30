# Validation Summary: How to Write IPv6 Addresses in URLs with Square Brackets

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- URL/URI syntax
- RFC 2732, RFC 3986, and RFC 6874
- curl
- GNU Wget
- OpenSSH
- Git over HTTP
- Python (`urllib.parse`, `ipaddress`)
- JavaScript WHATWG `URL` API
- Nginx
- Apache HTTP Server

## Sources Consulted
- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax - https://www.rfc-editor.org/rfc/rfc3986
- RFC 2732 info page (shows RFC 3986 obsoletes RFC 2732) - https://www.rfc-editor.org/info/rfc2732
- RFC 6874: Representing IPv6 Zone Identifiers in Address Literals and Uniform Resource Identifiers - https://www.rfc-editor.org/rfc/rfc6874
- Python `urllib.parse` documentation - https://docs.python.org/3/library/urllib.parse.html
- WHATWG URL Standard - https://url.spec.whatwg.org/
- Node.js URL API documentation - https://nodejs.org/api/url.html
- curl URL syntax documentation - https://curl.se/docs/url-syntax.html
- curl tutorial - https://curl.se/docs/tutorial.html
- GNU Wget manual - https://www.gnu.org/software/wget/manual/wget.html
- OpenSSH manual index / OpenBSD ssh(1) man page - https://www.openssh.org/manual.html
- Nginx `listen` directive documentation - https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Apache HTTP Server binding/listen documentation - https://httpd.apache.org/docs/current/bind.html
- Local runtime checks with Python 3, Node.js, curl 8.5.0, wget, ssh, and git in the repository environment

## Issues Found
- The intro described RFC 3986 as updating RFC 2732. RFC 3986 actually obsoletes RFC 2732. I corrected the description and introduction wording to reflect the historical relationship accurately.
- The JavaScript example said `url.hostname` would print `2001:db8::1`. Under the WHATWG URL model used by browsers and Node.js, the serialized IPv6 hostname includes brackets, so I corrected the expected output to `[2001:db8::1]`.
- The Nginx comment said `listen [::]:80;` and `listen [::]:443 ssl;` were dual-stack with IPv4. Nginx documents `ipv6only` as the setting that controls that wildcard behavior, with the default enabled, so I changed the comment to the accurate statement that these directives listen on all IPv6 addresses.

## Review Notes
- The zone ID section is technically correct per RFC 6874: literal `%` must be encoded as `%25` inside the bracketed IPv6 literal.
- curl documentation still discusses bracketed IPv6 literals alongside URL globbing behavior. In local validation, current curl accepted the example URLs as written, so no change was made there.
