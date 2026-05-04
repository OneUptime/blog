# Validation Summary: How to Configure uWSGI for IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- uWSGI (application server, including Emperor mode)
- Python WSGI
- IPv6 networking (dual-stack listeners, bracket notation)
- NGINX (upstream / `uwsgi_pass` / `proxy_pass`)
- systemd (service unit configuration)
- Unix domain sockets
- `ss` and `curl` troubleshooting commands

## Sources Consulted
- [uWSGI Options reference](https://uwsgi-docs.readthedocs.io/en/latest/Options.html)
- [uWSGI Emperor documentation](https://uwsgi-docs.readthedocs.io/en/latest/Emperor.html)
- [uWSGI Systemd documentation](https://uwsgi-docs.readthedocs.io/en/latest/Systemd.html)
- [uWSGI LogFormat documentation](https://uwsgi-docs.readthedocs.io/en/latest/LogFormat.html)
- [uWSGI Native HTTP support](https://uwsgi.readthedocs.io/en/latest/HTTP.html)
- [The uwsgi Protocol](https://uwsgi-docs.readthedocs.io/en/latest/Protocol.html)
- Third-party uwsgi-asgi project (https://github.com/tovmeod/uwsgi-asgi) confirming ASGI is not native

## Issues Found
1. **Incorrect ASGI claim in the introduction.** The post originally stated uWSGI supports "Python WSGI, Python ASGI". uWSGI does not natively support ASGI; ASGI requires a separate server (Uvicorn/Hypercorn/Daphne) or a third-party shim. Updated the intro to remove the ASGI claim and instead mention the broader range of language plugins (PSGI, Rack, etc.) that uWSGI actually supports.
2. **Invalid uWSGI option `vassal-friendly-exception` in the Emperor config.** This option does not exist in the uWSGI options reference. Removed the line from the Emperor `.ini` snippet in Step 4. The remaining `emperor` and `emperor-procname` directives are valid.

## Review Notes
- The systemd unit file in Step 5 closely matches the canonical example from the official uWSGI Systemd documentation (KillSignal=SIGQUIT, Type=notify, NotifyAccess=all). `Type=notify` requires uWSGI to be built with libsystemd / notify-socket support — most distro packages include this, but a hand-built uWSGI may need the `--notify-socket` / `--ready-init` options. Worth a passing mention in a future revision but not strictly an error.
- Step 6 (NGINX) is a bit ambiguous: `uwsgi_pass` only works when uWSGI is listening with `socket = ...` (uwsgi protocol), not `http-socket = ...`. The post does call this out via the `# Or for HTTP socket: proxy_pass` comment, so it is technically accurate, just easy to misread.
- `buffer-size = 65536` is correct, but the comment "important for IPv6 headers" is slightly misleading — buffer-size affects request header parsing in general; IPv6 itself does not produce notably larger headers. Left as-is since it is not factually wrong.
- Bracket notation (`[::]:8000`, `[::1]:9191`, `[2001:db8::1]:8000`) is correct uWSGI syntax for IPv6 sockets, and the dual-stack pattern with two `http-socket` lines is the documented approach.
