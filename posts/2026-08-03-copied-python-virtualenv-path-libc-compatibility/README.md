# Copied Python Virtualenvs: Builder Paths and libc Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Docker, Virtual Environments, Multi-Stage Builds, glibc, musl, Wheels, Troubleshooting

Description: Diagnose copied virtual-environment failures by checking absolute shebangs, interpreter and ABI identity, native-extension tags, libc family, architecture, and runtime libraries.

---

A copied virtual environment is a snapshot tied to the interpreter and platform that created it. Python's official `venv` documentation explicitly describes environments as inherently non-portable: installed scripts contain absolute shebang paths to the environment's interpreter, and moved environments should be recreated.

Containers can use a copied environment reliably only by preserving those assumptions. A builder at `/opt/venv` and runtime at `/app/venv`, or a glibc builder and musl runtime, violates the contract even though every file copied successfully.

## Failure 1: The Absolute Path Changed

Create an environment and inspect a console script:

```bash
python -m venv /opt/venv
/opt/venv/bin/python -m pip install gunicorn
head -n 1 /opt/venv/bin/gunicorn
```

The first line is normally similar to:

```text
#!/opt/venv/bin/python
```

If the final stage copies the directory elsewhere:

```dockerfile
COPY --from=builder /opt/venv /app/venv
CMD ["/app/venv/bin/gunicorn", "app:application"]
```

the wrapper still asks the kernel for `/opt/venv/bin/python`, so startup can report a missing file. Activation cannot repair the embedded shebang. Preserve the absolute path:

```dockerfile
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
```

Do not mass-rewrite scripts with `sed`. Entry-point wrappers are only one set of absolute references, and rewriting them cannot make compiled extensions ABI-compatible.

## Failure 2: The Runtime Interpreter Differs

A virtual environment contains `pyvenv.cfg`, scripts, installed packages, and usually a copy or symlink associated with the base Python installation. It does not make an incompatible runtime interpreter compatible.

Compare both stages:

```bash
python -c 'import platform, sys, sysconfig; print(sys.version); print(platform.machine()); print(sysconfig.get_platform()); print(sysconfig.get_config_var("SOABI"))'
```

The significant dimensions include:

- CPython versus another implementation;
- Python major and minor version;
- debug or other ABI variants;
- operating system and CPU architecture;
- paths to the base interpreter and shared `libpython`, when used.

Pure-Python modules can sometimes survive a wider range. A native extension with a filename such as `_example.cpython-314-x86_64-linux-gnu.so` encodes a much narrower contract.

## Failure 3: glibc and musl Are Different Targets

This tempting combination is unsafe:

```dockerfile
FROM python:3.14-slim AS builder
RUN python -m venv /opt/venv
# install dependencies

FROM python:3.14-alpine AS runtime
COPY --from=builder /opt/venv /opt/venv
```

The slim image is Debian-based and uses glibc. Alpine uses musl. Native extensions or shared libraries built for one are not generally loadable by the other. PyPA defines separate `manylinux` and `musllinux` platform-tag families for exactly this distinction.

Typical symptoms include `ImportError`, a missing `.so`, an undefined symbol, or a misleading missing-file error caused by an absent ELF interpreter. Inspect extensions in the builder with `file`, `readelf --program-headers`, and `readelf --dynamic`.

## Failure 4: A Runtime Shared Library Is Absent

The Python package may be present while a system library is not. Packages such as database drivers, image codecs, or cryptography bindings can link to libraries installed in the builder but omitted from the runtime.

For a trusted extension, locate and inspect it:

```bash
/opt/venv/bin/python -c 'import example_native; print(example_native.__file__)'
ldd /opt/venv/lib/python3.14/site-packages/example_native*.so
```

The Linux `ldd` manual warns against using it on untrusted executables. Use `objdump -p file.so | grep NEEDED` for non-executing direct-dependency inspection. Install required runtime libraries through the final image's package manager rather than copying random `.so` files.

## A Safe Copied-Venv Pattern

```dockerfile
# syntax=docker/dockerfile:1
ARG PYTHON_IMAGE=python:3.14-slim

FROM ${PYTHON_IMAGE} AS builder
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
COPY requirements.txt ./
RUN python -m pip install --requirement requirements.txt

FROM ${PYTHON_IMAGE} AS runtime
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
COPY --from=builder /opt/venv /opt/venv
COPY app/ /app/
WORKDIR /app
USER 10001:10001
CMD ["python", "-m", "app"]
```

For reproducibility, replace the mutable image value with a reviewed tag-and-digest reference and update it deliberately. One global image argument keeps both stages on the same declared reference, while the identical `/opt/venv` path preserves shebangs; the digest makes the base identity immutable.

## Prefer Reinstallation When the Contract Changes

If builder and runtime must differ, build a wheelhouse in a compatible target environment and install those wheels using the runtime interpreter. pip evaluates wheel compatibility tags and generates scripts for the final path. For arbitrary path or platform changes, recreate the environment rather than repairing its internals.

Test the final image by importing every native package, invoking installed console scripts, resolving DNS, and exercising TLS. `python --version` alone does not load the extensions most likely to fail.

## Official Documentation

- [Python venv portability warning and absolute shebangs](https://docs.python.org/3.14/library/venv.html)
- [PyPA platform compatibility tags](https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/)
- [pip debug command for compatible tags](https://pip.pypa.io/en/stable/cli/pip_debug/)
- [pip wheel documentation](https://pip.pypa.io/en/stable/cli/pip_wheel/)
- [Linux ldd documentation and security warning](https://man7.org/linux/man-pages/man1/ldd.1.html)
