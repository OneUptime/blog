# Validation Summary: How to Get the Client IPv4 Address from REST API Requests in Python

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python
- Flask
- Werkzeug
- FastAPI
- Starlette
- Uvicorn
- IPv4
- HTTP reverse proxies
- `X-Forwarded-For`

## Sources Consulted
- Flask docs, "Tell Flask it is Behind a Proxy": https://flask.palletsprojects.com/en/stable/deploying/proxy_fix/
- Werkzeug docs, `ProxyFix`: https://werkzeug.palletsprojects.com/en/stable/middleware/proxy_fix/
- Flask docs, configuration handling (`TRUSTED_HOSTS`): https://flask.palletsprojects.com/en/stable/config/
- Starlette docs, requests (`request.client`): https://www.starlette.io/requests/
- Starlette docs, middleware (`TrustedHostMiddleware`): https://www.starlette.io/middleware/
- FastAPI docs, deployment HTTPS / proxy forwarded headers: https://fastapi.tiangolo.com/deployment/https/
- FastAPI docs, behind a proxy: https://fastapi.tiangolo.com/advanced/behind-a-proxy/
- Uvicorn docs, settings (`--proxy-headers`, `--forwarded-allow-ips`): https://www.uvicorn.org/settings/
- Uvicorn docs, deployment / proxies and forwarded headers: https://www.uvicorn.org/deployment/
- Python standard library docs, `ipaddress`: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The Flask reverse-proxy example used `app.config["TRUSTED_PROXIES"] = 1`, but Flask does not provide a `TRUSTED_PROXIES` config for forwarded header trust. I removed that line and kept the documented `werkzeug.middleware.proxy_fix.ProxyFix` wrapper.
- The same Flask section said "Flask 2.3+ uses ProxyFix middleware", which was inaccurate. `ProxyFix` is Werkzeug middleware that must be applied explicitly when the app is actually behind a proxy. I corrected the example to reflect that.
- The manual Flask `X-Forwarded-For` example trusted the leftmost value from a single header. That is not a safe way to select a trustworthy client IP when proxies append to the header or when multiple `X-Forwarded-For` headers are present. I changed it to parse all header values, validate IPv4 entries, and walk the chain from right to left while skipping trusted proxy ranges.
- The first FastAPI example blindly trusted `x-forwarded-for`, which contradicted the post's own security guidance. I changed it so the direct-connection example reads `request.client.host`.
- The "FastAPI with TrustedHostMiddleware Proxy Support" section was technically wrong. `TrustedHostMiddleware` validates the `Host` header; it does not make FastAPI trust `X-Forwarded-For` for client IP resolution. I replaced that section with the documented approach: configure the ASGI server/Uvicorn to trust forwarded headers from known proxy IPs, then read `request.client.host`.

## Review Notes
- The examples are now aligned with the documented proxy-handling behavior in Flask/Werkzeug and FastAPI/Uvicorn.
- The post remains IPv4-oriented. In dual-stack deployments, `request.remote_addr` or `request.client.host` may be IPv6 unless you explicitly filter for IPv4.
- I also parsed all five Python code blocks with `python3` to confirm they are syntactically valid.
