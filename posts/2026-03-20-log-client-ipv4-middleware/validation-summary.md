# Validation Summary: How to Log Client IPv4 Addresses in REST API Middleware

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flask
- Werkzeug `ProxyFix`
- FastAPI / Starlette request handling
- Uvicorn proxy-header handling
- Express
- Python `ipaddress`
- HTTP proxy headers (`X-Forwarded-*`)

## Sources Consulted
- Flask documentation: Tell Flask it is Behind a Proxy — https://flask.palletsprojects.com/en/stable/deploying/proxy_fix/
- Flask documentation: The Request Context — https://flask.palletsprojects.com/en/stable/reqcontext/
- Werkzeug documentation: ProxyFix — https://werkzeug.palletsprojects.com/en/stable/middleware/proxy_fix/
- FastAPI documentation: Behind a Proxy — https://fastapi.tiangolo.com/advanced/behind-a-proxy/
- Starlette documentation: Requests — https://www.starlette.io/requests/
- Uvicorn documentation: Settings — https://www.uvicorn.org/settings/
- Uvicorn documentation: Deployment / Proxies and Forwarded Headers — https://www.uvicorn.org/deployment/
- Express documentation: Express behind proxies — https://expressjs.com/en/guide/behind-proxies.html
- Python standard library documentation: `ipaddress` — https://docs.python.org/3/library/ipaddress.html
- Article 29 Working Party letter hosted by the European Commission — https://ec.europa.eu/justice/article-29/documentation/other-document/files/2010/2010_05_26_letter_wp_google.pdf

## Issues Found
- The FastAPI example manually trusted `X-Forwarded-For`, which is not the proxy-aware pattern recommended by the FastAPI/Uvicorn docs, and it could also fail because `request.client` may be `None`. I changed it to use `request.client` and clarified that trusted proxy-header handling must be configured in Uvicorn/FastAPI.
- The Flask and Express examples implied the proxy-derived IP was always the "real" client IP. I clarified that the shown `ProxyFix(..., x_for=1)` and `app.set("trust proxy", 1)` settings assume exactly one trusted reverse-proxy hop.
- The GDPR/anonymisation section overstated what last-octet masking guarantees. I renamed the section and updated the conclusion to say that masking can reduce identifiability, but it is not by itself a guaranteed GDPR-compliant anonymisation technique.

## Review Notes
- The examples are valid with current Flask/Werkzeug, FastAPI/Starlette/Uvicorn, and Express APIs after the fixes above.
- If a deployment is dual-stack, these framework APIs may still expose an IPv6 or IPv4-mapped IPv6 address string; additional normalization would be needed if downstream systems require dotted-quad IPv4 only.
