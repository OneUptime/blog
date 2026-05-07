# Validation Summary: How to Use Podman for Batch Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containers
- Bash
- Python
- Dockerfile / container image build
- Pandas

## Sources Consulted
- Podman `run` documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `container prune` documentation: https://docs.podman.io/en/v5.0.2/markdown/podman-container-prune.1.html
- Podman `image prune` documentation: https://docs.podman.io/en/stable/markdown/podman-image-prune.1.html
- Podman `system prune` documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Python `subprocess` documentation: https://docs.python.org/3/library/subprocess.html
- Python `concurrent.futures` documentation: https://docs.python.org/3/library/concurrent.futures.html

## Issues Found
- The introductory `podman run` examples and the retry example invoked `/scripts/process.sh`, but the image in the article sets `ENTRYPOINT ["python3"]` and the sample script provided is `/scripts/process_csv.py`. I updated those command examples to call `/scripts/process_csv.py` so they match the image entrypoint and the actual script shown in the post.
- The Dockerfile used `RUN chmod +x /scripts/*.sh /scripts/*.py`, which can fail when readers only create the sample Python script shown in the article. I changed it to `RUN chmod +x /scripts/process_csv.py` so the example works as written.
- The batch orchestrator job list referenced `/scripts/process.py`, but the article defines `scripts/process_csv.py`. I corrected the filename to match the provided script.
- The batch orchestrator reported `sum(r['duration'] for r in results)` as total batch time, which overstates runtime when jobs run in parallel because it sums per-job durations instead of measuring wall-clock elapsed time. I changed the example to measure elapsed batch time around `run_batch(...)` and updated the output label accordingly.
- The cleanup script comment said `podman container prune -f` removes stopped containers from failed jobs. The command actually removes all stopped containers. I corrected the comment to match Podman behavior.

## Review Notes
- The Podman CLI flags used in the post, including `--rm`, `--memory`, `--cpus`, and `-v ...:ro,Z`, are current and valid per the official Podman documentation.
- The `:Z` volume suffix is SELinux-specific. It is correct for SELinux-enabled hosts, but readers on platforms without SELinux may not need it.
- The queue example uses `source` to load job files, which is acceptable for trusted internal job definitions but should not be used with untrusted input.
