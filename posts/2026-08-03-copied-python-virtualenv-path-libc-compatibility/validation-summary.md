# Validation Summary: Copied Python Virtualenvs: Builder Paths and libc Compatibility

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Python 3.14
- Python virtual environments (`venv`)
- pip and Python wheel installation
- Docker and multi-stage Docker builds
- CPython ABI and native extension modules
- glibc, musl, `manylinux`, and `musllinux`
- Linux ELF and shared-library inspection tools (`file`, `readelf`, `ldd`, and `objdump`)

## Sources Consulted
- Python 3.14 `venv` documentation: https://docs.python.org/3.14/library/venv.html
- Python 3.14 `importlib` documentation: https://docs.python.org/3.14/library/importlib.html
- Python 3.14 free-threading documentation: https://docs.python.org/3.14/howto/free-threading-python.html
- Python 3.14 C extension module documentation: https://docs.python.org/3.14/c-api/extension-modules.html
- PEP 3149, ABI-version-tagged shared objects: https://peps.python.org/pep-3149/
- PyPA platform compatibility tags specification: https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/
- PyPA wheel binary distribution specification: https://packaging.python.org/en/latest/specifications/binary-distribution-format/
- pip `debug` documentation: https://pip.pypa.io/en/stable/cli/pip_debug/
- pip `wheel` documentation: https://pip.pypa.io/en/stable/cli/pip_wheel/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Official Image documentation for Python: https://hub.docker.com/_/python
- Docker image digest documentation: https://docs.docker.com/dhi/explore/security-concepts/digests/
- GNU Binutils `readelf` documentation: https://sourceware.org/binutils/docs/binutils/readelf.html
- Linux `ldd(1)` manual page: https://man7.org/linux/man-pages/man1/ldd.1.html

## Issues Found
- The ELF-interpreter diagnostic referred only to extensions, but shared-object extensions do not normally contain the program interpreter whose absence produces the misleading “not found” error. The text now directs readers to inspect native extensions and executables.
- The shared-library diagnostic imported `example_native` to discover its path. That fails before printing the path when the module cannot load because a dependency is missing. It now uses `importlib.util.find_spec()` to locate the extension without executing it and passes the exact returned path to `ldd`.

## Review Notes
- Verified the absolute gunicorn shebang and the CPython 3.14 `SOABI`/extension suffix in the current official `python:3.14-slim` image.
- Python 3.14 free-threaded builds have a distinct ABI (`cpython-314t`). Python also documents broad compatibility between release and debug builds while warning that code built against a debug build is not necessarily compatible with a release build, so the post's cautious ABI-variant wording remains appropriate.
- The diagnostic tools are valid, but minimal images may require installing packages such as `file` and `binutils` before those tools are available.
- The illustrative `python -m app` command assumes the copied application contents expose an importable `app` module or package with an executable module entry point.
