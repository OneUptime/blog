# Validation Summary: How to Install and Use HTTPie on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- HTTPie CLI
- HTTP requests and methods
- JSON request bodies
- HTTP headers and authentication
- API testing
- GraphQL requests
- TLS certificates
- Proxies

## Sources Consulted
- HTTPie CLI documentation: https://httpie.io/docs/cli/meta
- GitHub REST API authentication documentation: https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api

## Issues Found
- The official HTTPie Debian/Ubuntu repository key URL was incorrect. Changed `https://packages.httpie.io/deb.gpg` to the documented `https://packages.httpie.io/deb/KEY.gpg`.
- The pip installation commands did not upgrade an existing install, despite the section describing the current/latest version. Changed them to `python3 -m pip install --upgrade httpie` and `python3 -m pip install --user --upgrade httpie`.
- The `http -b` example described `-b` as quiet/no-format mode. HTTPie uses `-b` as the body-only shortcut; formatting is controlled separately with `--pretty`. Updated the comment.
- The `--print=HhBb` example used `GET` against `https://httpbin.org/post` while sending a request body item. Changed the method to `POST` so the example matches the endpoint and description.
- The GitHub API session example used `Authorization: token ...`. GitHub still documents that this usually works, but current examples use `Authorization: Bearer ...`, and JWTs require `Bearer`. Updated the example to use `Bearer`.

## Review Notes
The remaining HTTPie syntax examples for request items, JSON fields, raw request bodies, sessions, downloads, forms, TLS options, proxies, and output selection align with the HTTPie 3.2.4 CLI documentation. The commands use public example endpoints such as httpbin.org and jsonplaceholder.typicode.com where appropriate; `api.example.com` and similar domains are clearly placeholders.
