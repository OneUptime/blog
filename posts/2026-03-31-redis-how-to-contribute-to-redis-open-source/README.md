# How to Contribute to Redis Open Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Open Source, Contribution, GitHub, Community

Description: A practical guide to contributing to Redis open source - from setting up a dev environment to submitting your first pull request.

---

Redis is one of the most widely used open source projects in the world. Contributing to it is a great way to sharpen your C skills, deepen your knowledge of distributed systems, and give back to a project that powers millions of applications. This guide walks you through the process.

## Understanding the Redis Codebase

Redis is written in C and lives at [https://github.com/redis/redis](https://github.com/redis/redis). Before contributing, spend time reading the `src/` directory and the `README` files. Key files include:

- `src/server.c` - the main server loop
- `src/t_string.c`, `src/t_list.c`, etc. - data type implementations
- `src/networking.c` - client connection handling

## Setting Up Your Development Environment

Clone the repository and build from source:

```bash
git clone https://github.com/redis/redis.git
cd redis
make
```

Run the test suite to make sure everything works:

```bash
make test
```

Redis uses a custom Tcl-based test framework. You can run a specific test file with:

```bash
./runtest --single tests/unit/type/string
```

## Finding Issues to Work On

Good starting points for new contributors:

- GitHub issues labeled `good first issue`
- The `TODO` and `FIXME` comments in the source code
- Documentation improvements in the `doc/` or markdown files

Search for beginner-friendly issues:

```bash
# Browse on GitHub
# https://github.com/redis/redis/labels/good%20first%20issue
```

## Making Your First Contribution

1. Fork the repository on GitHub.
2. Create a feature branch from `unstable` (the main development branch).
3. Write your code with tests.
4. Run the full test suite.
5. Submit a pull request.

```bash
git checkout unstable
git checkout -b fix/my-bugfix
# make your changes
make test
git commit -m "Fix: describe what you fixed"
git push origin fix/my-bugfix
```

## Contribution Guidelines

Redis maintainers expect:

- Clean, readable C code following the existing style
- Tests for any new functionality
- A clear commit message explaining the change
- No breaking changes to the public API without discussion

For larger features, open an issue first to discuss the approach before writing code. The Redis community is active on GitHub Discussions and the redis-dev mailing list.

## Documentation and Non-Code Contributions

Not all contributions are code. You can improve:

- The Redis documentation at [redis.io/docs](https://redis.io/docs)
- Module ecosystem documentation
- Example configurations and tutorials

The docs are managed in a separate repository at `https://github.com/redis/redis-doc`.

```bash
git clone https://github.com/redis/redis-doc.git
# Edit markdown files, then submit a PR
```

## Summary

Contributing to Redis starts with building from source, running the test suite, and finding a good first issue. Follow the project's code style, write tests, and open a discussion before tackling large changes. Documentation contributions are equally valuable and a great entry point for new contributors.
