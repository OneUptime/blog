# Validation Summary: How to Run Ceph Tests with Teuthology

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- Teuthology (Ceph integration testing framework)
- Paddles (Teuthology REST API backend)
- Pulpito (Teuthology web dashboard)
- RADOS (Reliable Autonomic Distributed Object Store)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Python (custom task development)
- YAML (test suite definitions)

## Sources Consulted
- Teuthology GitHub repository: https://github.com/ceph/teuthology
- Teuthology setup.cfg console_scripts entry points (for CLI command verification)
- Teuthology INSTALL.rst (for installation method verification)
- Teuthology scripts/run.py (for --version flag verification)
- Teuthology scripts/suite.py (for teuthology-suite flags)
- Teuthology scripts/results.py (for teuthology-results flags)
- Teuthology scripts/report.py (for teuthology-report flags)
- Teuthology scripts/ls.py (for teuthology-ls usage)
- Teuthology task/__init__.py (for Task base class API)
- Paddles GitHub repository: https://github.com/ceph/paddles
- Pulpito GitHub repository: https://github.com/ceph/pulpito
- Ceph RGW source configuration (rgw.yaml.in for default port)

## Issues Found

1. **teuthology-worker does not exist**: The post listed `teuthology-worker` as a component that "runs on test machines." This CLI command does not exist in the current teuthology codebase. The actual components are `teuthology-dispatcher` (picks up jobs from the queue) and `teuthology-supervisor` (runs individual jobs). Fixed to reference `teuthology-dispatcher` with an accurate description.

2. **Paddles and Pulpito descriptions were incorrect/swapped**: The post described paddles as "web interface for test results" and pulpito as "another results dashboard." In reality, paddles is the RESTful API backend for storing and querying test results, and pulpito is the web dashboard frontend that consumes the paddles API. Fixed both descriptions.

3. **Installation method was incomplete**: The post showed `pip install -e .` as the installation method. The official recommended method is to use the `./bootstrap` script, which handles system dependencies, creates a virtualenv, and installs everything. Fixed to use `./bootstrap` and activate the resulting virtualenv.

4. **Misleading comment about teuthology-nuke**: The comment "For local testing without full infrastructure, use teuthology-nuke" was placed above a `teuthology-suite` command, which was both misleading and incorrect. `teuthology-nuke` is not a standard CLI command in the current codebase, and the functionality it historically referred to was about tearing down test clusters, not running local tests. Fixed the comment to accurately describe what `teuthology-suite` does.

5. **teuthology-results flags were wrong**: The post used `--run` and `--machine-type` flags, but the actual command uses `--name` and `--archive-dir`. Fixed to use the correct flags.

6. **teuthology-report --output flag does not exist**: The post used `--output report.html` which is not a valid flag. The command does not support HTML output generation. Fixed to show the correct usage without the non-existent flag.

7. **teuthology-ls syntax was completely wrong**: The post used `--run` and `--status` named flags, but `teuthology-ls` takes a positional archive directory argument and only supports `-v/--verbose`. Fixed to show the correct positional argument syntax.

8. **RGW default port was wrong**: The custom task example used `http://localhost:8000` as the RGW endpoint. The default Ceph RGW port is 7480 (configured as `beast port=7480` in the Ceph source). Fixed to use port 7480.

## Review Notes
- The YAML suite file structure and task definitions (roles, tasks with install/ceph/rados/s3tests) follow correct teuthology conventions.
- The custom Task class API (setup/begin/end methods, self.ctx, self.config) is accurate. The `teardown()` method also exists on the Task base class but was not mentioned; this is acceptable for a minimal example.
- The `teuthology --version` flag is confirmed to work correctly.
- The `teuthology-suite` flags (--suite, --ceph, --machine-type, --distro, --distro-version) are all valid.
- The `teuthology` flags (--lock, --suite-path, --owner) are all valid.
- The `task = MyCephTask` module-level assignment at the end of the custom task file is the correct pattern for registering teuthology tasks.
