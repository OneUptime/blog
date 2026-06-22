# Validation Summary: How to Build a Config System with Hot Reload in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python dataclasses, typing, pathlib, threading, hashlib, json, os, logging, copy, and datetime modules
- PyYAML
- YAML and JSON configuration files
- Environment variables
- FastAPI
- pytest

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation

## Issues Found
- `datetime.utcnow()` is deprecated in Python 3.12 and returns a naive datetime. Changed it to `datetime.now(timezone.utc)` and imported `timezone`.
- The `file_watcher.py` snippet used `Optional` without importing it and imported unused symbols. Added the correct `Optional` import and removed unused imports.
- The watcher used MD5 for a non-security file content hash. Replaced it with `hashlib.blake2b(digest_size=16)` to avoid MD5/FIPS caveats while preserving the same change-detection behavior.
- The `config_manager.py` snippet referenced `ConfigSchema`, `ConfigValidationError`, and `FileWatcher` without importing them. Added imports from `config_core` and `file_watcher`.
- Schema defaults were only applied during reload, so the initial `config.validate()` flow did not apply optional defaults as described. Updated `validate()` to apply schema defaults before validation.
- Reloading rebuilt config from files only, which meant environment variables no longer overrode file values after a hot reload. Stored environment sources and reapplied them during reload.
- A failed reload could leave the manager with invalid partially reloaded configuration because `_config` was mutated before validation. Changed reload to build and validate a new config dictionary before swapping it into place.
- The usage example called placeholder application update functions without context. Added a short comment clarifying that they should be supplied by the application.
- The test snippet used `ConfigManager`, `ConfigSchema`, and `ConfigValidationError` without importing them, and included unused imports. Added the required import and removed unused imports.

## Review Notes
The Python snippets were extracted and compiled successfully with `python3`. `pytest` is not installed in this environment, so the pytest file could not be run directly; equivalent smoke checks for YAML load, hot reload, environment override, defaults, validation, and failed-reload behavior passed.
